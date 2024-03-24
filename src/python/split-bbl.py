#!/usr/bin/env python
import logging
import os
from js_status import reportStatusToJs
import json

LOG_MIN_BYTES = 500000

async def async_split_bbl(bbl_path, out_path):
    await reportStatusToJs("SPLITTING_BBL")
    with open(bbl_path, 'rb') as binary_log_view:
        content = binary_log_view.read()

    # The first line of the overall BBL file re-appears at the beginning
    # of each recorded session.
    try:
        first_newline_index = content.index(str('\n').encode('utf8'))
    except ValueError as e:
        raise ValueError('No newline in') from e

    firstline = content[:first_newline_index + 1]

    raw_logs = content.split(firstline)

    sub_bbl_file_names = []
    for log_index, raw_log in enumerate(raw_logs):
        _, path_ext = os.path.splitext(os.path.basename(bbl_path))
        sub_bbl_path = os.path.join(out_path, f"{log_index}{path_ext}")

        with open(sub_bbl_path, 'wb') as sub_bbl:
            sub_bbl.write(firstline + raw_log)
        sub_bbl_file_names.append(sub_bbl_path)

    await reportStatusToJs("BBLS_SPLITTED", len(sub_bbl_file_names) - 1)

    return sub_bbl_file_names

async def async_get_log_header(sub_bbl_filename_list):
    await reportStatusToJs("READING_HEADERS_START", len(sub_bbl_filename_list))

    all_header = []
    for sub_bbl_index, sub_bbl_filename in enumerate(sub_bbl_filename_list):
        await reportStatusToJs("READING_HEADERS_FROM_SUB_BBL_START", sub_bbl_index)

        sub_bbl_file = open(sub_bbl_filename, 'rb')
        lines = sub_bbl_file.readlines()

        ### in case info is not provided by log, empty str is printed in plot
        header = {
            'tempFile'          :'',
            'dynThrottle'       :'',
            'craftName'         :'',
            'fwType'            :'',
            'version'           :'',
            'date'              :'',
            'rcRate'            :'',
            'rcExpo'            :'',
            'rcYawExpo'         :'',
            'rcYawRate'         :'',
            'rates'             :'',
            'rollPID'           :'',
            'pitchPID'          :'',
            'yawPID'            :'',
            'deadBand'          :'',
            'yawDeadBand'       :'',
            'logNum'            :'',
            'tpa_breakpoint'    :'0',
            'minThrottle'       :'',
            'maxThrottle'       :'',
            'tpa_percent'       :'',
            'dTermSetPoint'     :'',
            'vbatComp'          :'',
            'gyro_lpf'          :'',
            'gyro_lowpass_type' :'',
            'gyro_lowpass_hz'   :'',
            'gyro_notch_hz'     :'',
            'gyro_notch_cutoff' :'',
            'dterm_filter_type' :'',
            'dterm_lpf_hz'      :'',
            'yaw_lpf_hz'        :'',
            'dterm_notch_hz'    :'',
            'dterm_notch_cutoff':'',
            'debug_mode'        :'',
            'simplified_master_multiplier'      : '',
            'simplified_i_gain'                 : '',
            'simplified_d_gain'                 : '',
            'simplified_pi_gain'                : '',
            'simplified_dmax_gain'              : '',
            'simplified_feedforward_gain'       : '',
            'simplified_pitch_d_gain'           : '',
            'simplified_pitch_pi_gain'          : '',
            'simplified_dterm_filter'           : '',
            'simplified_dterm_filter_multiplier': '',
            'simplified_gyro_filter'            : '',
            'simplified_gyro_filter_multiplier' : ''
        }

        ### different versions of fw have different names for the same thing.
        translate_dic={
            'dynThrPID:'            :'dynThrottle',
            'Craft name:'           :'craftName',
            'Firmware type:'        :'fwType',
            'Firmware revision:'    :'version',
            'Firmware date:'        :'fwDate',
            'rcRate:'               :'rcRate',
            'rc_rate:'              :'rcRate',
            'rcExpo:'               :'rcExpo',
            'rc_expo:'              :'rcExpo',
            'rcYawExpo:'            :'rcYawExpo',
            'rc_expo_yaw:'          :'rcYawExpo',
            'rcYawRate:'            :'rcYawRate',
            'rc_rate_yaw:'          :'rcYawRate',
            'rates:'                :'rates',
            'rollPID:'              :'rollPID',
            'pitchPID:'             :'pitchPID',
            'yawPID:'               :'yawPID',
            ' deadband:'            :'deadBand',
            'yaw_deadband:'         :'yawDeadBand',
            'tpa_breakpoint:'       :'tpa_breakpoint',
            'minthrottle:'          :'minThrottle',
            'maxthrottle:'          :'maxThrottle',
            'dtermSetpointWeight:'  :'dTermSetPoint',
            'dterm_setpoint_weight:':'dTermSetPoint',
            'vbat_pid_compensation:':'vbatComp',
            'vbat_pid_gain:'        :'vbatComp',
            'gyro_lpf:'             :'gyro_lpf',
            'gyro_lowpass_type:'    :'gyro_lowpass_type',
            'gyro_lowpass_hz:'      :'gyro_lowpass_hz',
            'gyro_lpf_hz:'          :'gyro_lowpass_hz',
            'gyro_notch_hz:'        :'gyro_notch_hz',
            'gyro_notch_cutoff:'    :'gyro_notch_cutoff',
            'dterm_filter_type:'    :'dterm_filter_type',
            'dterm_lpf_hz:'         :'dterm_lpf_hz',
            'yaw_lpf_hz:'           :'yaw_lpf_hz',
            'dterm_notch_hz:'       :'dterm_notch_hz',
            'dterm_notch_cutoff:'   :'dterm_notch_cutoff',
            'debug_mode:'           :'debug_mode',
            'simplified_master_multiplier'      : 'simplified_master_multiplier',
            'simplified_i_gain'                 : 'simplified_i_gain',
            'simplified_d_gain'                 : 'simplified_d_gain',
            'simplified_pi_gain'                : 'simplified_pi_gain',
            'simplified_dmax_gain'              : 'simplified_dmax_gain',
            'simplified_feedforward_gain'       : 'simplified_feedforward_gain',
            'simplified_pitch_d_gain'           : 'simplified_pitch_d_gain',
            'simplified_pitch_pi_gain'          : 'simplified_pitch_pi_gain',
            'simplified_dterm_filter'           : 'simplified_dterm_filter',
            'simplified_dterm_filter_multiplier': 'simplified_dterm_filter_multiplier',
            'simplified_gyro_filter'            : 'simplified_gyro_filter',
            'simplified_gyro_filter_multiplier' : 'simplified_gyro_filter_multiplier'
        }

        header['tempFile'] = sub_bbl_filename
        header['logNum'] = str(sub_bbl_index)
        ### check for known keys and translate to useful ones.
        for raw_line in lines:
            decoded_line = raw_line.decode('latin-1')
            for translation_key, translation_value in translate_dic.items():
                if translation_key in decoded_line:
                    header_value = decoded_line.split(':')[-1]
                    header[translation_value] = header_value[:-1]

        all_header.append(header)
        await reportStatusToJs("READING_HEADERS_FROM_SUB_BBL_COMPLETE", sub_bbl_index)

    await reportStatusToJs("READING_HEADERS_COMPLETE")
    return all_header

async def async_run():
    bbl_path = "/log.bbl"
    out_path = "/splits"

    logging.basicConfig(
    format='%(levelname)s %(asctime)s %(filename)s:%(lineno)s: %(message)s',
    level=logging.INFO)

    logging.info('Decoding BBL file: %s', bbl_path)

    os.makedirs(out_path, exist_ok=True)

    await reportStatusToJs("RUNNING")
    sub_bbl_filenames = await async_split_bbl(bbl_path, out_path)
    all_sub_bbl_headers = await async_get_log_header(sub_bbl_filenames)

    combined_json_output = []
    for index, header in enumerate(all_sub_bbl_headers):
        combined_json_output.append({
            'header': header,
            'bbl_filename': sub_bbl_filenames[index],
        })

    json_file_name = "/result.json"
    with open(json_file_name, 'w', encoding='utf-8') as json_file:
        json_file.write(json.dumps(combined_json_output, indent=4, sort_keys=True))
    json_file.close()

    await reportStatusToJs("COMPLETE")

await async_run()