#!/usr/bin/env python
import logging
from js_status import reportStatusToJs
import json
import numpy as np
from pandas import read_csv
from scipy.interpolate import interp1d
from scipy.ndimage.filters import gaussian_filter1d
from scipy.optimize import minimize
import sys
import os

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
            'gyro': self.gyro.tolist(),
            'input': self.input.tolist(),
            'time': self.time.tolist(),
            'throttle': self.throttle.tolist(),
            'time_resp': self.time_resp.tolist(),
            'resp_low': [
                self.resp_low[0].tolist(),
            ],
            'high_mask': self.high_mask.tolist(),
            'noise_gyro': {
                'freq_axis': self.noise_gyro['freq_axis'].tolist(),
                'hist2d_sm': self.noise_gyro['hist2d_sm'].tolist(),
            },
            'noise_d': {
                'freq_axis': self.noise_d['freq_axis'].tolist(),
                'hist2d_sm': self.noise_d['hist2d_sm'].tolist(),
            },
            'noise_debug': {
                'freq_axis': self.noise_debug['freq_axis'].tolist(),
                'hist2d_sm': self.noise_debug['hist2d_sm'].tolist(),
            },
        }

        if self.high_mask.sum()>0:
            output['resp_high'] = self.resp_high[0].tolist()

        return output

    def __init__(self, data):
        self.data = data

    async def async_init(self):
        self.input, _ = await self.async_equalize(self.data['time'], self.pid_in(self.data['p_err'], self.data['gyro'], self.data['P']))  # /20.
        self.data.update({'input': self.pid_in(self.data['p_err'], self.data['gyro'], self.data['P'])})
        self.equalize_data()

        self.time = self.data['time']
        self.dt=self.time[0]-self.time[1]

        self.input = self.data['input']

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

        self.resp_sm = await self.async_weighted_mode_avr(self.spec_sm, self.toolow_mask, [-1.5,3.5], 1000)
        self.resp_quality = -self.to_mask((np.abs(self.spec_sm -self.resp_sm[0]).mean(axis=1)).clip(0.5-1e-9,0.5))+1.
        # masking by setting trottle of unwanted traces to neg
        self.thr_response = self.hist2d(self.max_thr * (2. * (self.toolow_mask*self.resp_quality) - 1.), self.time_resp,
                                        (self.spec_sm.transpose() * self.toolow_mask).transpose(), [101, self.rlen])

        self.resp_low = await self.async_weighted_mode_avr(self.spec_sm, self.low_mask*self.toolow_mask, [-1.5,3.5], 1000)
        if self.high_mask.sum()>0:
            self.resp_high = await self.async_weighted_mode_avr(self.spec_sm, self.high_mask*self.toolow_mask, [-1.5,3.5], 1000)

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

    async def async_equalize(self, time, data):
        ### equalizes time scale
        if (len(time) == 0 or len(data) == 0):
            logging.warning('No data for equalization!')
            await reportStatusToJs("ERROR", "No data for equalization!")
            sys.exit(0)

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
        # maybe pass throttle for further analysis...
        filt = trace_filt[:-int(Trace.noise_superpos * 2. / Trace.noise_framelen), :] * window
        ref = trace_ref[:-int(Trace.noise_superpos * 2. / Trace.noise_framelen), :] * window
        time = time[:-int(Trace.noise_superpos * 2. / Trace.noise_framelen), :]

        full_freq_f, full_spec_f = self.spectrum(self.data['time'], [self.data['gyro']])
        full_freq_r, full_spec_r = self.spectrum(self.data['time'], [self.data['debug']])

        f_amp_freq, f_amp_hist = np.histogram(full_freq_f, weights=np.abs(full_spec_f.real).flatten(), bins=int(full_freq_f[-1]))
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

        return {
            'hist2d_norm': hist2d_norm,
            'hist2d': hist2d,
            'throt_hist': throt_hist_avr,
            'throt_scale': throt_scale_avr
        }

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

        return {
            'throt_hist_avr': hist2d['throt_hist'],
            'throt_axis': hist2d['throt_scale'],
            'freq_axis': freq[::4],
            'hist2d_norm': hist2d['hist2d_norm'],
            'hist2d_sm': hist2d_sm,
            'hist2d': hist2d['hist2d'],
            'max':maxval
        }

    async def async_weighted_mode_avr(self, values, weights, vertrange, vertbins):
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


            if (resp_y.size == 0):
                await reportStatusToJs("ERROR", "resp_y.size == 0")
                sys.exit(0)
                return
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
    def __init__(self, fpath, headdict, result_path):
        self.file = fpath
        self.headdict = headdict
        self.result_path = result_path

    async def async_init(self):
        self.data = await self.async_readcsv(self.file)
        self.traces = self.find_traces(self.data)

        await reportStatusToJs("WRITE_HEADDICT_TO_JSON_START")
        headdict_out_path = self.result_path + "/headdict.json"
        with open(headdict_out_path, 'w', encoding='utf-8') as json_file:
            json.dump(self.headdict, json_file, ensure_ascii=False, indent=4)
        json_file.close()
        await reportStatusToJs("WRITE_HEADDICT_TO_JSON_COMPLETE")

        await self.async_analyze()

    async def async_analyze(self):
        await reportStatusToJs("ANALYZE_PID_START")

        for trace_data in self.traces:
            logging.info(trace_data['name'] + '...   ')
            await reportStatusToJs("ANALYZE_PID_TRACE_START", trace_data['name'])
            logging.info('trace constructor')
            trace = Trace(trace_data)

            logging.info('trace async init')
            await trace.async_init()

            logging.info('trace to json')
            trace_out_path = self.result_path + "/trace_" + trace_data['name'] + ".json"
            with open(trace_out_path, 'w', encoding='utf-8') as json_file:
                json.dump(trace.to_json_object(), json_file, ensure_ascii=False, indent=4)
            json_file.close()
            await reportStatusToJs("ANALYZE_PID_TRACE_COMPLETE", trace_data['name'])
            del trace

        await reportStatusToJs("ANALYZE_PID_COMPLETE")

    async def async_readcsv(self, fpath):
        await reportStatusToJs("READING_CSV_START")
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
        
        await reportStatusToJs("READING_CSV_COMPLETE")
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


async def async_run():
    await reportStatusToJs("START")
    log_csv_path = "/log.csv"
    log_header_path = "/log-header.json"
    result_path = "/results"

    logging.basicConfig(
    format='%(levelname)s %(asctime)s %(filename)s:%(lineno)s: %(message)s',
    level=logging.INFO)

    if not os.path.exists(result_path):
        os.makedirs(result_path)

    # read headdict from log_header.json
    with open(log_header_path, 'r', encoding='utf-8') as header_file:
        header_dict = json.load(header_file)
    header_file.close()

    log = CSV_log(log_csv_path, header_dict, result_path)
    await log.async_init()

    del log

    await reportStatusToJs("COMPLETE")

await async_run()