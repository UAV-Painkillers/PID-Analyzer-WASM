#!/usr/bin/env python
import logging
import os
import subprocess
import numpy as np
from pandas import read_csv
from scipy.interpolate import interp1d
from scipy.ndimage.filters import gaussian_filter1d
from scipy.optimize import minimize
import json
from blackbox_decoder import decode as blackbox_decoder_decode
from js_status import reportStatusToJs


# ----------------------------------------------------------------------------------
# "THE BEER-WARE LICENSE" (Revision 42):
# <florian.melsheimer@gmx.de> wrote this file. As long as you retain this notice you
# can do whatever you want with this stuff. If we meet some day, and you think
# this stuff is worth it, you can buy me a beer in return. Florian Melsheimer
# ----------------------------------------------------------------------------------


Version = 'PID-Analyzer 0.52'

LOG_MIN_BYTES = 500000

class Trace:
    framelen = 1.           # length of each single frame over which to compute response
    resplen = 0.5           # length of respose window
    cutfreq = 25.           # cutfreqency of what is considered as input
    tuk_alpha = 1.0         # alpha of tukey window, if used
    superpos = 16           # sub windowing (superpos windows in framelen)
    low_threshold = 50      # treshold for 'looooow input rate'
    threshold = 500.        # threshold for 'high input rate'
    noise_framelen = 0.3    # window width for noise analysis
    noise_superpos = 16     # subsampling for noise analysis windows

    def to_json_object(self):
        output = {
            'name': self.name,
            'gyro': self.gyro.tolist(),
            'input': self.input.tolist(),
            'time': self.time.tolist(),
            'throttle': self.throttle.tolist(),
            'avr_t': self.avr_t.tolist(),
            'spec_sm': self.spec_sm.tolist(),
            'thr_response': {
                'hist2d_norm': {
                    'histogram': self.thr_response['hist2d_norm'][0].tolist(),
                    'bins': self.thr_response['hist2d_norm'][1].tolist()
                }
            },
            'time_resp': self.time_resp.tolist(),
            'resp_low': [
                self.resp_low[0].tolist(),
            ],
        }

        if self.high_mask.sum()>0:
            output['resp_high'] = self.resp_high[0].tolist()

        return output

    def __init__(self, data):
        self.data = data
        self.input = self.equalize(data['time'], self.pid_in(data['p_err'], data['gyro'], data['P']))[1]  # /20.
        self.data.update({'input': self.pid_in(data['p_err'], data['gyro'], data['P'])})
        self.equalize_data()

        self.name = self.data['name']
        self.time = self.data['time']
        self.dt=self.time[0]-self.time[1]

        self.input = self.data['input']
        #enable this to generate artifical gyro trace with known system response
        #self.data['gyro']=self.toy_out(self.input, delay=0.01, mode='normal')####

        self.gyro = self.data['gyro']
        self.throttle = self.data['throttle']
        self.throt_hist, self.throt_scale = np.histogram(self.throttle, np.linspace(0, 100, 101, dtype=np.float64), density=True)

        self.flen = self.stepcalc(self.time, Trace.framelen)        # array len corresponding to framelen in s
        self.rlen = self.stepcalc(self.time, Trace.resplen)         # array len corresponding to resplen in s
        self.time_resp = self.time[0:self.rlen]-self.time[0]

        self.stacks = self.winstacker({'time':[],'input':[],'gyro':[], 'throttle':[]}, self.flen, Trace.superpos)                                  # [[time, input, output],]
        self.window = np.hanning(self.flen)                                     #self.tukeywin(self.flen, self.tuk_alpha)
        self.spec_sm, self.avr_t, self.avr_in, self.max_in, self.max_thr = self.stack_response(self.stacks, self.window)
        self.low_mask, self.high_mask = self.low_high_mask(self.max_in, self.threshold)       #calcs masks for high and low inputs according to threshold
        self.toolow_mask = self.low_high_mask(self.max_in, 20)[1]          #mask for ignoring noisy low input

        self.resp_sm = self.weighted_mode_avr(self.spec_sm, self.toolow_mask, [-1.5,3.5], 1000)
        self.resp_quality = -self.to_mask((np.abs(self.spec_sm -self.resp_sm[0]).mean(axis=1)).clip(0.5-1e-9,0.5))+1.
        # masking by setting trottle of unwanted traces to neg
        self.thr_response = self.hist2d(self.max_thr * (2. * (self.toolow_mask*self.resp_quality) - 1.), self.time_resp,
                                        (self.spec_sm.transpose() * self.toolow_mask).transpose(), [101, self.rlen])

        self.resp_low = self.weighted_mode_avr(self.spec_sm, self.low_mask*self.toolow_mask, [-1.5,3.5], 1000)
        if self.high_mask.sum()>0:
            self.resp_high = self.weighted_mode_avr(self.spec_sm, self.high_mask*self.toolow_mask, [-1.5,3.5], 1000)

        self.noise_winlen = self.stepcalc(self.time, Trace.noise_framelen)
        self.noise_stack = self.winstacker({'time':[], 'gyro':[], 'throttle':[], 'd_err':[], 'debug':[]},
                                           self.noise_winlen, Trace.noise_superpos)
        self.noise_win = np.hanning(self.noise_winlen)

        self.noise_gyro = self.stackspectrum(self.noise_stack['time'],self.noise_stack['throttle'],self.noise_stack['gyro'], self.noise_win)
        self.noise_d = self.stackspectrum(self.noise_stack['time'], self.noise_stack['throttle'], self.noise_stack['d_err'], self.noise_win)
        self.noise_debug = self.stackspectrum(self.noise_stack['time'], self.noise_stack['throttle'], self.noise_stack['debug'], self.noise_win)
        if self.noise_debug['hist2d'].sum()>0:
            ## mask 0 entries
            thr_mask = self.noise_gyro['throt_hist_avr'].clip(0,1)
            self.filter_trans = np.average(self.noise_gyro['hist2d'], axis=1, weights=thr_mask)/\
                                np.average(self.noise_debug['hist2d'], axis=1, weights=thr_mask)
        else:
            self.filter_trans = self.noise_gyro['hist2d'].mean(axis=1)*0.

    @staticmethod
    def low_high_mask(signal, threshold):
        low = np.copy(signal)

        low[low <=threshold] = 1.
        low[low > threshold] = 0.
        high = -low+1.

        if high.sum() < 10:     # ignore high pinput that is too short
            high *= 0.

        return low, high

    def to_mask(self, clipped):
        clipped-=clipped.min()
        clipped/=clipped.max()
        return clipped

    def pid_in(self, pval, gyro, pidp):
        pidin = gyro + pval / (0.032029 * pidp)       # 0.032029 is P scaling factor from betaflight
        return pidin

    def rate_curve(self, rcin, inmax=500., outmax=800., rate=160.):
        ### an estimated rate curve. not used.
        expoin = (np.exp((rcin - inmax) / rate) - np.exp((-rcin - inmax) / rate)) * outmax
        return expoin

    def calc_delay(self, time, trace1, trace2):
        ### minimizes trace1-trace2 by shifting trace1
        tf1 = interp1d(time[2000:-2000], trace1[2000:-2000], fill_value=0., bounds_error=False)
        tf2 = interp1d(time[2000:-2000], trace2[2000:-2000], fill_value=0., bounds_error=False)
        fun = lambda x: ((tf1(time - x*0.5) - tf2(time+ x*0.5)) ** 2).mean()
        shift = minimize(fun, np.array([0.01])).x[0]
        steps = np.round(shift / (time[1] - time[0]))
        return {'time':shift, 'steps':int(steps)}

    def tukeywin(self, len, alpha=0.5):
        ### makes tukey widow for envelopig
        M = len
        n = np.arange(M - 1.)  #
        if alpha <= 0:
            return np.ones(M)  # rectangular window
        elif alpha >= 1:
            return np.hanning(M)

        # Normal case
        x = np.linspace(0, 1, M, dtype=np.float64)
        w = np.ones(x.shape)

        # first condition 0 <= x < alpha/2
        first_condition = x < alpha / 2
        w[first_condition] = 0.5 * (1 + np.cos(2 * np.pi / alpha * (x[first_condition] - alpha / 2)))

        # second condition already taken care of

        # third condition 1 - alpha / 2 <= x <= 1
        third_condition = x >= (1 - alpha / 2)
        w[third_condition] = 0.5 * (1 + np.cos(2 * np.pi / alpha * (x[third_condition] - 1 + alpha / 2)))

        return w

    def toy_out(self, inp, delay=0.01, length=0.01, noise=5., mode='normal', sinfreq=100.):
        # generates artificial output for benchmarking
        freq= 1./(self.time[1]-self.time[0])
        toyresp = np.zeros(int((delay+length)*freq))
        toyresp[int((delay)*freq):]=1.
        toyresp/=toyresp.sum()
        toyout = np.convolve(inp, toyresp, mode='full')[:len(inp)]#*0.9
        if mode=='normal':
            noise_sig = (np.random.random_sample(len(toyout))-0.5)*noise
        elif mode=='sin':
            noise_sig = (np.sin(2.*np.pi*self.time*sinfreq)) * noise
        else:
            noise_sig=0.
        return toyout+noise_sig

    def equalize(self, time, data):
        ### equalizes time scale
        data_f = interp1d(time, data)
        newtime = np.linspace(time[0], time[-1], len(time), dtype=np.float64)
        return newtime, data_f(newtime)

    def equalize_data(self):
        ### equalizes full dict of data
        time = self.data['time']
        newtime = np.linspace(time[0], time[-1], len(time), dtype=np.float64)
        for key in self.data:
              if isinstance(self.data[key],np.ndarray):
                  if len(self.data[key])==len(time):
                      self.data[key]= interp1d(time, self.data[key])(newtime)
        self.data['time']=newtime

    def stepcalc(self, time, duration):
        ### calculates frequency and resulting windowlength
        tstep = (time[1]-time[0])
        freq = 1./tstep
        arr_len = duration * freq
        return int(arr_len)

    def winstacker(self, stackdict, flen, superpos):
        ### makes stack of windows for deconvolution
        tlen = len(self.data['time'])
        shift = int(flen/superpos)
        wins = int(tlen/shift)-superpos
        for i in np.arange(wins):
            for key in stackdict.keys():
                stackdict[key].append(self.data[key][i * shift:i * shift + flen])
        for k in stackdict.keys():
            #print 'key',k
            #print stackdict[k]
            stackdict[k]=np.array(stackdict[k], dtype=np.float64)
        return stackdict

    def wiener_deconvolution(self, input, output, cutfreq):      # input/output are two-dimensional
        pad = 1024 - (len(input[0]) % 1024)                     # padding to power of 2, increases transform speed
        input = np.pad(input, [[0,0],[0,pad]], mode='constant')
        output = np.pad(output, [[0, 0], [0, pad]], mode='constant')
        H = np.fft.fft(input, axis=-1)
        G = np.fft.fft(output,axis=-1)
        freq = np.abs(np.fft.fftfreq(len(input[0]), self.dt))
        sn = self.to_mask(np.clip(np.abs(freq), cutfreq-1e-9, cutfreq))
        len_lpf=np.sum(np.ones_like(sn)-sn)
        sn=self.to_mask(gaussian_filter1d(sn,len_lpf/6.))
        sn= 10.*(-sn+1.+1e-9)       # +1e-9 to prohibit 0/0 situations
        Hcon = np.conj(H)
        deconvolved_sm = np.real(np.fft.ifft(G * Hcon / (H * Hcon + 1./sn),axis=-1))
        return deconvolved_sm

    def stack_response(self, stacks, window):
        inp = stacks['input'] * window
        outp = stacks['gyro'] * window
        thr = stacks['throttle'] * window

        deconvolved_sm = self.wiener_deconvolution(inp, outp, self.cutfreq)[:, :self.rlen]
        delta_resp = deconvolved_sm.cumsum(axis=1)

        max_thr = np.abs(np.abs(thr)).max(axis=1)
        avr_in = np.abs(np.abs(inp)).mean(axis=1)
        max_in = np.max(np.abs(inp), axis=1)
        avr_t = stacks['time'].mean(axis=1)

        return delta_resp, avr_t, avr_in, max_in, max_thr

    def spectrum(self, time, traces):
        ### fouriertransform for noise analysis. returns frequencies and spectrum.
        pad = 1024 - (len(traces[0]) % 1024)  # padding to power of 2, increases transform speed
        traces = np.pad(traces, [[0, 0], [0, pad]], mode='constant')
        trspec = np.fft.rfft(traces, axis=-1, norm='ortho')
        trfreq = np.fft.rfftfreq(len(traces[0]), time[1] - time[0])
        return trfreq, trspec

    def stackfilter(self, time, trace_ref, trace_filt, window):
        ### calculates filter transmission and phaseshift from stack of windows. Not in use, maybe later.
        # slicing off last 2s to get rid of landing
        #maybe pass throttle for further analysis...
        filt = trace_filt[:-int(Trace.noise_superpos * 2. / Trace.noise_framelen), :] * window
        ref = trace_ref[:-int(Trace.noise_superpos * 2. / Trace.noise_framelen), :] * window
        time = time[:-int(Trace.noise_superpos * 2. / Trace.noise_framelen), :]

        full_freq_f, full_spec_f = self.spectrum(self.data['time'], [self.data['gyro']])
        full_freq_r, full_spec_r = self.spectrum(self.data['time'], [self.data['debug']])

        f_amp_freq, f_amp_hist =np.histogram(full_freq_f, weights=np.abs(full_spec_f.real).flatten(), bins=int(full_freq_f[-1]))
        r_amp_freq, r_amp_hist = np.histogram(full_freq_r, weights=np.abs(full_spec_r.real).flatten(), bins=int(full_freq_r[-1]))

    def hist2d(self, x, y, weights, bins):   #bins[nx,ny]
        ### generates a 2d hist from input 1d axis for x,y. repeats them to match shape of weights X*Y (data points)
        ### x will be 0-100%
        freqs = np.repeat(np.array([y], dtype=np.float64), len(x), axis=0)
        throts = np.repeat(np.array([x], dtype=np.float64), len(y), axis=0).transpose()
        throt_hist_avr, throt_scale_avr = np.histogram(x, 101, [0, 100])

        hist2d = np.histogram2d(throts.flatten(), freqs.flatten(),
                                range=[[0, 100], [y[0], y[-1]]],
                                bins=bins, weights=weights.flatten(), density=False)[0].transpose()

        hist2d = np.array(abs(hist2d), dtype=np.float64)
        hist2d_norm = np.copy(hist2d)
        hist2d_norm /=  (throt_hist_avr + 1e-9)

        return {'hist2d_norm':hist2d_norm, 'hist2d':hist2d, 'throt_hist':throt_hist_avr,'throt_scale':throt_scale_avr}

    def stackspectrum(self, time, throttle, trace, window):
        ### calculates spectrogram from stack of windows against throttle.
        # slicing off last 2s to get rid of landing
        gyro = trace[:-int(Trace.noise_superpos*2./Trace.noise_framelen),:] * window
        thr = throttle[:-int(Trace.noise_superpos*2./Trace.noise_framelen),:] * window
        time = time[:-int(Trace.noise_superpos*2./Trace.noise_framelen),:]

        freq, spec = self.spectrum(time[0], gyro)

        weights = abs(spec.real)
        avr_thr = np.abs(thr).max(axis=1)

        hist2d=self.hist2d(avr_thr, freq,weights,[101,int(len(freq)/4)])

        filt_width = 3  # width of gaussian smoothing for hist data
        hist2d_sm = gaussian_filter1d(hist2d['hist2d_norm'], filt_width, axis=1, mode='constant')

        # get max value in histogram >100hz
        thresh = 100.
        mask = self.to_mask(freq[:-1:4].clip(thresh-1e-9,thresh))
        maxval = np.max(hist2d_sm.transpose()*mask)

        return {'throt_hist_avr':hist2d['throt_hist'],'throt_axis':hist2d['throt_scale'],'freq_axis':freq[::4],
                'hist2d_norm':hist2d['hist2d_norm'], 'hist2d_sm':hist2d_sm, 'hist2d':hist2d['hist2d'], 'max':maxval}

    def weighted_mode_avr(self, values, weights, vertrange, vertbins):
        ### finds the most common trace and std
        threshold = 0.5  # threshold for std calculation
        filt_width = 7  # width of gaussian smoothing for hist data

        resp_y = np.linspace(vertrange[0], vertrange[-1], vertbins, dtype=np.float64)
        times = np.repeat(np.array([self.time_resp],dtype=np.float64), len(values), axis=0)
        weights = np.repeat(weights, len(values[0]))

        hist2d = np.histogram2d(times.flatten(), values.flatten(),
                                range=[[self.time_resp[0], self.time_resp[-1]], vertrange],
                                bins=[len(times[0]), vertbins], weights=weights.flatten())[0].transpose()
        ### shift outer edges by +-1e-5 (10us) bacause of dtype32. Otherwise different precisions lead to artefacting.
        ### solution to this --> somethings strage here. In outer most edges some bins are doubled, some are empty.
        ### Hence sometimes produces "divide by 0 error" in "/=" operation.

        if hist2d.sum():
            hist2d_sm = gaussian_filter1d(hist2d, filt_width, axis=0, mode='constant')
            hist2d_sm /= np.max(hist2d_sm, 0)


            pixelpos = np.repeat(resp_y.reshape(len(resp_y), 1), len(times[0]), axis=1)
            avr = np.average(pixelpos, 0, weights=hist2d_sm * hist2d_sm)
        else:
            hist2d_sm = hist2d
            avr = np.zeros_like(self.time_resp)
        # only used for monochrome error width
        hist2d[hist2d <= threshold] = 0.
        hist2d[hist2d > threshold] = 0.5 / (vertbins / (vertrange[-1] - vertrange[0]))

        std = np.sum(hist2d, 0)

        return avr, std, [self.time_resp, resp_y, hist2d_sm]

    ### calculates weighted avverage and resulting errors
    def weighted_avg_and_std(self, values, weights):
        average = np.average(values, axis=0, weights=weights)
        variance = np.average((values - average) ** 2, axis=0, weights=weights)
        return (average, np.sqrt(variance))

class CSV_log:
    def __init__(self, fpath, name, headdict, noise_bounds):
        # session number is inside fpath, fpath ends with xxx.<number>.csv where number is the session number
        sessionNumber = fpath.split('.')[-2]
        reportStatusToJs("Processing session " + sessionNumber + "...")
        self.file = fpath
        self.name = name
        self.headdict = headdict

        self.data = self.readcsv(self.file)

        logging.info('Processing:')
        self.traces = self.find_traces(self.data)
        self.roll, self.pitch, self.yaw = self.__analyze()

        # TODO: write results to FS, where the name is fpath but with a .json extension, so we need to replace the .csv with .json
        jsonFileName = fpath.replace('.csv', '.json')
        combinedJsonOutput = {
            'roll': self.roll.to_json_object(),
            'pitch': self.pitch.to_json_object(),
            'yaw': self.yaw.to_json_object(),
            'headdict': self.headdict
        }
        with open(jsonFileName, 'w') as jsonFile:
            jsonFile.write(json.dumps(combinedJsonOutput, indent=4, sort_keys=True))
        jsonFile.close()

    def __analyze(self):
        analyzed = []
        for t in self.traces:
            logging.info(t['name'] + '...   ')
            analyzed.append(Trace(t))
        return analyzed

    def readcsv(self, fpath):
        logging.info('Reading: Log '+str(self.headdict['logNum']))
        datdic = {}
        ### keycheck for 'usecols' only reads usefull traces, uncommend if needed
        wanted =  ['time (us)',
                   'rcCommand[0]', 'rcCommand[1]', 'rcCommand[2]', 'rcCommand[3]',
                   'axisP[0]','axisP[1]','axisP[2]',
                   'axisI[0]', 'axisI[1]', 'axisI[2]',
                   'axisD[0]', 'axisD[1]','axisD[2]',
                   'gyroADC[0]', 'gyroADC[1]', 'gyroADC[2]',
                   'gyroData[0]', 'gyroData[1]', 'gyroData[2]',
                   'ugyroADC[0]', 'ugyroADC[1]', 'ugyroADC[2]',
                   #'accSmooth[0]','accSmooth[1]', 'accSmooth[2]',
                   'debug[0]', 'debug[1]', 'debug[2]','debug[3]',
                   #'motor[0]', 'motor[1]', 'motor[2]', 'motor[3]',
                   #'energyCumulative (mAh)','vbatLatest (V)', 'amperageLatest (A)'
                   ]
        data = read_csv(fpath, header=0, skipinitialspace=1, usecols=lambda k: k in wanted, dtype=np.float64)
        datdic.update({'time_us': data['time (us)'].values * 1e-6})
        datdic.update({'throttle': data['rcCommand[3]'].values})

        for i in ['0', '1', '2']:
            datdic.update({'rcCommand' + i: data['rcCommand['+i+']'].values})
            #datdic.update({'PID loop in' + i: data['axisP[' + i + ']'].values})
            try:
                datdic.update({'debug' + i: data['debug[' + i + ']'].values})
            except:
                logging.warning('No debug['+str(i)+'] trace found!')
                datdic.update({'debug' + i: np.zeros_like(data['rcCommand[' + i + ']'].values)})

            # get P trace (including case of missing trace)
            try:
                datdic.update({'PID loop in' + i: data['axisP[' + i + ']'].values})
            except:
                logging.warning('No P['+str(i)+'] trace found!')
                datdic.update({'PID loop in' + i: np.zeros_like(data['rcCommand[' + i + ']'].values)})

            try:
                datdic.update({'d_err'+i: data['axisD[' + i+']'].values})
            except:
                logging.warning('No D['+str(i)+'] trace found!')
                datdic.update({'d_err' + i: np.zeros_like(data['rcCommand[' + i + ']'].values)})

            try:
                datdic.update({'I_term'+i: data['axisI[' + i+']'].values})
            except:
                if i<2:
                    logging.warning('No I['+str(i)+'] trace found!')
                datdic.update({'I_term' + i: np.zeros_like(data['rcCommand[' + i + ']'].values)})

            datdic.update({'PID sum' + i: datdic['PID loop in'+i]+datdic['I_term'+i]+datdic['d_err'+i]})
            
            if 'gyroADC[0]' in data.keys():
                datdic.update({'gyroData' + i: data['gyroADC[' + i+']'].values})
            elif 'gyroData[0]' in data.keys():
                datdic.update({'gyroData' + i: data['gyroData[' + i+']'].values})
            elif 'ugyroADC[0]' in data.keys():
                datdic.update({'gyroData' + i: data['ugyroADC[' + i+']'].values})
            else:
                logging.warning('No gyro trace found!')
        return datdic


    def find_traces(self, dat):
        time = self.data['time_us']
        throttle = dat['throttle']

        throt = ((throttle - 1000.) / (float(self.headdict['maxThrottle']) - 1000.)) * 100.

        traces = [{'name':'roll'},{'name':'pitch'},{'name':'yaw'}]

        for i, dic in enumerate(traces):
            dic.update({'time':time})
            dic.update({'p_err':dat['PID loop in'+str(i)]})
            dic.update({'rcinput': dat['rcCommand' + str(i)]})
            dic.update({'gyro':dat['gyroData'+str(i)]})
            dic.update({'PIDsum':dat['PID sum'+str(i)]})
            dic.update({'d_err': dat['d_err' + str(i)]})
            dic.update({'debug': dat['debug' + str(i)]})
            if 'KISS' in self.headdict['fwType']:
                dic.update({'P': 1.})
                self.headdict.update({'tpa_percent': 0.})
            elif 'Raceflight' in self.headdict['fwType']:
                dic.update({'P': 1.})
                self.headdict.update({'tpa_percent': 0.})

            else:
                dic.update({'P':float((self.headdict[dic['name']+'PID']).split(',')[0])})
                self.headdict.update({'tpa_percent': (float(self.headdict['tpa_breakpoint']) - 1000.) / 10.})

            dic.update({'throttle':throt})

        return traces


class BB_log:
    def __init__(self, log_file_path, noise_bounds):
        self.name = "tmp"
        self.log_file_path = log_file_path
        self.tmp_dir = os.path.join(os.path.dirname(self.log_file_path), self.name)
        if not os.path.isdir(self.tmp_dir):
            os.makedirs(self.tmp_dir)
        self.noise_bounds=noise_bounds

    async def asyncInit(self):
        self.loglist = await self.decode(self.log_file_path)
        self.heads = self.beheader(self.loglist)
        self.figs = self._csv_iter(self.heads)

        self.deletejunk(self.loglist)

    def deletejunk(self, loglist):
        for l in loglist:
            os.remove(l)
            os.remove(l[:-3]+'01.csv')
            try:
                os.remove(l[:-3]+'01.event')
            except:
                logging.warning('No .event file of '+l+' found.')
        return

    def _csv_iter(self, heads):
        figs = []
        for h in heads:
            CSV_log(h['tempFile'][:-3]+'01.csv', self.name, h, self.noise_bounds)
        return figs

    def beheader(self, loglist):
        reportStatusToJs("Reading log file headers...")
        heads = []
        for i, bblog in enumerate(loglist):
            log = open(os.path.join(self.tmp_dir, bblog), 'rb')
            lines = log.readlines()
            ### in case info is not provided by log, empty str is printed in plot
            headsdict = {'tempFile'     :'',
                         'dynThrottle' :'',
                         'craftName'   :'',
                         'fwType': '',
                         'version'     :'',
                         'date'        :'',
                         'rcRate'      :'',
                         'rcExpo'       :'',
                         'rcYawExpo'    :'',
                         'rcYawRate'   :'',
                         'rates'        :'',
                         'rollPID'     :'',
                         'pitchPID'    :'',
                         'yawPID'      :'',
                         'deadBand'    :'',
                         'yawDeadBand' :'',
                         'logNum'       :'',
                         'tpa_breakpoint':'0',
                         'minThrottle':'',
                         'maxThrottle': '',
                         'tpa_percent':'',
                         'dTermSetPoint':'',
                         'vbatComp':'',
                         'gyro_lpf':'',
                         'gyro_lowpass_type':'',
                         'gyro_lowpass_hz':'',
                         'gyro_notch_hz':'',
                         'gyro_notch_cutoff':'',
                         'dterm_filter_type':'',
                         'dterm_lpf_hz':'',
                         'yaw_lpf_hz':'',
                         'dterm_notch_hz':'',
                         'dterm_notch_cutoff':'',
                         'debug_mode':''
                         }
            ### different versions of fw have different names for the same thing.
            translate_dic={'dynThrPID:':'dynThrottle',
                         'Craft name:':'craftName',
                         'Firmware type:':'fwType',
                         'Firmware revision:':'version',
                         'Firmware date:':'fwDate',
                         'rcRate:':'rcRate', 'rc_rate:':'rcRate',
                         'rcExpo:':'rcExpo', 'rc_expo:':'rcExpo',
                         'rcYawExpo:':'rcYawExpo', 'rc_expo_yaw:':'rcYawExpo',
                         'rcYawRate:':'rcYawRate', 'rc_rate_yaw:':'rcYawRate',
                         'rates:':'rates',
                         'rollPID:':'rollPID',
                         'pitchPID:':'pitchPID',
                         'yawPID:':'yawPID',
                         ' deadband:':'deadBand',
                         'yaw_deadband:':'yawDeadBand',
                         'tpa_breakpoint:':'tpa_breakpoint',
                         'minthrottle:':'minThrottle',
                         'maxthrottle:':'maxThrottle',
                         'dtermSetpointWeight:':'dTermSetPoint','dterm_setpoint_weight:':'dTermSetPoint',
                         'vbat_pid_compensation:':'vbatComp','vbat_pid_gain:':'vbatComp',
                         'gyro_lpf:':'gyro_lpf',
                         'gyro_lowpass_type:':'gyro_lowpass_type',
                         'gyro_lowpass_hz:':'gyro_lowpass_hz','gyro_lpf_hz:':'gyro_lowpass_hz',
                         'gyro_notch_hz:':'gyro_notch_hz',
                         'gyro_notch_cutoff:':'gyro_notch_cutoff',
                         'dterm_filter_type:':'dterm_filter_type',
                         'dterm_lpf_hz:':'dterm_lpf_hz',
                         'yaw_lpf_hz:':'yaw_lpf_hz',
                         'dterm_notch_hz:':'dterm_notch_hz',
                         'dterm_notch_cutoff:':'dterm_notch_cutoff',
                         'debug_mode:':'debug_mode'
                         }

            headsdict['tempFile'] = bblog
            headsdict['logNum'] = str(i)
            ### check for known keys and translate to useful ones.
            for raw_line in lines:
                l = raw_line.decode('latin-1')
                for k in translate_dic.keys():
                    if k in l:
                        val =l.split(':')[-1]
                        headsdict.update({translate_dic[k]:val[:-1]})

            heads.append(headsdict)
        return heads

    async def decode(self, fpath):
        reportStatusToJs("Splitting log file into sessions...")

        """Splits out one BBL per recorded session and converts each to CSV."""
        with open(fpath, 'rb') as binary_log_view:
            content = binary_log_view.read()

        # The first line of the overall BBL file re-appears at the beginning
        # of each recorded session.
        try:
          first_newline_index = content.index(str('\n').encode('utf8'))
        except ValueError as e:
            raise ValueError(
                'No newline in %dB of log data from %r.'
                % (len(content), fpath),
                e)
        firstline = content[:first_newline_index + 1]

        split = content.split(firstline)
        bbl_sessions = []
        for i in range(len(split)):
            path_root, path_ext = os.path.splitext(os.path.basename(fpath))
            temp_path = os.path.join(
                self.tmp_dir, '%s_temp%d%s' % (path_root, i, path_ext))
            with open(temp_path, 'wb') as newfile:
                newfile.write(firstline+split[i])
            bbl_sessions.append(temp_path)

        loglist = []
        for bbl_session in bbl_sessions:
            size_bytes = os.path.getsize(os.path.join(self.tmp_dir, bbl_session))
            if size_bytes > LOG_MIN_BYTES:
                try:
                    # TODO: split this whole file into two
                    # one for splitting the .bbl file into sessions
                    # then decode them each using the blackbox decoder
                    # and then call the other half of this python code to run the analysis on them

                    reportStatusToJs("Decoding log number %r." % bbl_session)
                    logging.info('Decoding %r.' % bbl_session)
                    await blackbox_decoder_decode(bbl_session)
                    reportStatusToJs("Decoding of log number %r complete." % bbl_session)
                    logging.info('Decoding of %r complete.' % bbl_session)
                    #msg = subprocess.check_call([self.blackbox_decode_bin_path, bbl_session])
                    loglist.append(bbl_session)
                except:
                    logging.error(
                        'Error in Blackbox_decode of %r' % bbl_session, exc_info=True)
            else:
                reportStatusToJs("Ignoring log number %r since it is too small." % bbl_session)
                # There is often a small bogus session at the start of the file.
                logging.warning(
                    'Ignoring BBL session %r, %dB < %dB.'
                    % (bbl_session, size_bytes, LOG_MIN_BYTES))
                os.remove(bbl_session)

        return loglist


async def run_analysis(log_file_path, noise_bounds):
    bbLog = BB_log(log_file_path, noise_bounds)
    await bbLog.asyncInit()
    reportStatusToJs("Analysis complete.")
    logging.info('Analysis complete, showing plot. (Close plot to exit.)')


def strip_quotes(filepath):
    """Strips single or double quotes and extra whitespace from a string."""
    return filepath.strip().strip("'").strip('"')


def clean_path(path):
    return os.path.abspath(os.path.expanduser(strip_quotes(path)))

reportStatusToJs("Starting analysis...")
logging.basicConfig(
    format='%(levelname)s %(asctime)s %(filename)s:%(lineno)s: %(message)s',
    level=logging.INFO)

log_path = "/logs/flightlog.bbl"
noise_bounds = [[1.,10.1],[1.,100.],[1.,100.],[0.,4.]]

await run_analysis(clean_path(log_path), noise_bounds)