import { useState, useCallback, useEffect } from 'react';
import { readAllDevices, readDeviceVariants, readImageCombos } from '../utils/tomlParser';

const WELCOME_MESSAGE = `RuyiSDK Device Provisioning Wizard

This is a wizard intended to help you install a system on your device for your
development pleasure, all with ease.

You will be asked some questions that help RuyiSDK understand your device and
your intended configuration, then packages will be downloaded and flashed onto
the device's storage, that you should somehow make available on this host
system beforehand.

Note that, as Ruyi does not run as root, but raw disk access is most likely
required to flash images, you should arrange to allow your user account sudo
access to necessary commands such as dd. Flashing will fail if the sudo
configuration does not allow so.

Continue? (y/N)`;

const STATES = {
  WELCOME: 'welcome',
  DEVICE_SELECT: 'device_select',
  VARIANT_SELECT: 'variant_select',
  SYSTEM_SELECT: 'system_select',
  CONFIRM_DOWNLOAD: 'confirm_download',
  DOWNLOADING: 'downloading',
  DISK_PATH: 'disk_path',
  FLASHING: 'flashing',
  COMPLETE: 'complete',
  RESTART: 'restart'
};

export default function useProvisionWizard() {
  const [state, setState] = useState(STATES.WELCOME);
  const [history, setHistory] = useState([{ type: 'output', text: WELCOME_MESSAGE }]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [devices, setDevices] = useState([]);
  const [variants, setVariants] = useState([]);
  const [systems, setSystems] = useState([]);

  const addToHistory = useCallback((text, type = 'output') => {
    setHistory(prev => [...prev, { type, text }]);
  }, []);

  // Load devices when entering device selection state
  useEffect(() => {
    if (state === STATES.DEVICE_SELECT) {
      readAllDevices()
        .then(deviceList => {
          setDevices(deviceList);
          addToHistory('\nThe following devices are currently supported by the wizard. Please pick your device:');
          deviceList.forEach((device, index) => {
            addToHistory(`  ${index + 1}. ${device.displayName}`);
          });
          addToHistory(`\nChoice? (1-${deviceList.length})`);
        })
        .catch(err => {
          console.error('Failed to load devices:', err);
          setError('Failed to load device list. Please try again.');
          setState(STATES.RESTART);
        });
    }
  }, [state, addToHistory]);

  const simulateDownload = useCallback(() => {
    setDownloadProgress(0);
    addToHistory('info: downloading https://mirror.iscas.ac.cn/openeuler-sig-riscv/openEuler-RISC-V/preview/openEuler-23.03-V1-riscv64/D1/openEuler-23.03-V1-xfce-d1-preview.img.zst to /home/zhang/.cache/ruyi/distfiles/openEuler-23.03-V1-xfce-d1-preview.img.zst');
    
    // 模拟下载进度
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setDownloadProgress(progress);
      
      if (progress === 100) {
        clearInterval(interval);
        addToHistory('100  895M  100  895M    0     0  2150k      0  0:07:06  0:07:06 --:--:-- 2728k');
        addToHistory('info: extracting openEuler-23.03-V1-xfce-d1-preview.img.zst for package oerv-awol-d1-xfce-0.2303.1');
        addToHistory('/home/zhang/.cache/ruyi/distfiles/openEuler-23.03-V1-xfce-d1-preview.img.zst: 8589934592 bytes');
        addToHistory('info: package oerv-awol-d1-xfce-0.2303.1 installed to /home/zhang/.local/share/ruyi/blobs/oerv-awol-d1-xfce-0.2303.1');
        addToHistory(`
For initializing this target device, you should plug into this host system the
device's storage (e.g. SD card or NVMe SSD), or a removable disk to be
reformatted as a live medium, and note down the corresponding device file
path(s), e.g. /dev/sdX, /dev/nvmeXnY for whole disks; /dev/sdXY, /dev/nvmeXnYpZ
for partitions. You may consult e.g. sudo blkid output for the
information you will need later.

Please give the path for the target's whole disk:`);
        setDownloadProgress(null);
        setState(STATES.DISK_PATH);
      }
    }, 300);
  }, [addToHistory]);

  const simulateFlashing = useCallback(() => {
    setState(STATES.FLASHING);
    addToHistory('\nWe have collected enough information for the actual flashing. Now is the last chance to re-check and confirm everything is fine.');
    addToHistory('\nWe are about to:');
    addToHistory(' * Write the system image to /dev/sda');
    addToHistory('\nProceeding with flashing...');
    
    // 模拟刷写过程
    setTimeout(() => {
      addToHistory('\nIt seems the flashing has finished without errors.');
      addToHistory('\nHappy hacking!');
      addToHistory('\nWould you like to start another device provisioning? (y/N)');
      setState(STATES.COMPLETE);
    }, 2000);
  }, [addToHistory]);

  const onInputChange = useCallback((e) => {
    setInput(e.target.value);
  }, []);

  const onInputSubmit = useCallback((e) => {
    e.preventDefault();
    const value = input.trim();
    addToHistory(`${value}`, 'input');
    setInput('');

    switch (state) {
      case STATES.WELCOME:
        if (value.toLowerCase() === 'y') {
          setState(STATES.DEVICE_SELECT);
        } else if (value.toLowerCase() === 'n') {
          addToHistory('\nExiting. You can restart the wizard whenever prepared.\n');
          setState(STATES.RESTART);
        } else {
          addToHistory("Unrecognized input '" + value + "'.");
          addToHistory("Accepted choices: Y/y/yes for YES, N/n/no for NO.");
        }
        break;

      case STATES.RESTART:
        setHistory([{ type: 'output', text: WELCOME_MESSAGE }]);
        setState(STATES.WELCOME);
        setSelectedDevice(null);
        setSelectedVariant(null);
        setSelectedSystem(null);
        setDownloadProgress(null);
        setError(null);
        setDevices([]);
        setVariants([]);
        setSystems([]);
        break;

      case STATES.DEVICE_SELECT:
        const deviceChoice = parseInt(value);
        if (deviceChoice >= 1 && deviceChoice <= devices.length) {
          const device = devices[deviceChoice - 1];
          setSelectedDevice(device);
          setState(STATES.VARIANT_SELECT);
          readDeviceVariants(device.id)
            .then(variantList => {
              setVariants(variantList);
              addToHistory('\nThe device has the following variants. Please choose the one corresponding to your hardware at hand:');
              variantList.forEach((variant, index) => {
                addToHistory(`  ${index + 1}. ${device.displayName} (${variant.variantName})`);
              });
              addToHistory(`\nChoice? (1-${variantList.length})`);
            })
            .catch(err => {
              console.error('Failed to load variants:', err);
              setError('Failed to load device variants. Please try again.');
              setState(STATES.RESTART);
            });
        } else {
          addToHistory(`Invalid choice. Please enter a number between 1 and ${devices.length}.`);
        }
        break;

      case STATES.VARIANT_SELECT:
        const variantChoice = parseInt(value);
        if (variantChoice >= 1 && variantChoice <= variants.length) {
          const variant = variants[variantChoice - 1];
          setSelectedVariant(variant);
          setState(STATES.SYSTEM_SELECT);
          readImageCombos(selectedDevice.id, variant.id)
            .then(systemList => {
              setSystems(systemList);
              addToHistory('\nThe following system configurations are supported by the device variant you have chosen. Please pick the one you want to put on the device:');
              systemList.forEach((system, index) => {
                addToHistory(`  ${index + 1}. ${system.displayName}`);
              });
              addToHistory(`\nChoice? (1-${systemList.length})`);
            })
            .catch(err => {
              console.error('Failed to load system configurations:', err);
              setError('Failed to load system configurations. Please try again.');
              setState(STATES.RESTART);
            });
        } else {
          addToHistory(`Invalid choice. Please enter a number between 1 and ${variants.length}.`);
        }
        break;

      case STATES.SYSTEM_SELECT:
        const systemChoice = parseInt(value);
        if (systemChoice >= 1 && systemChoice <= systems.length) {
          const system = systems[systemChoice - 1];
          setSelectedSystem(system);
          setState(STATES.CONFIRM_DOWNLOAD);
          addToHistory('\nWe are about to download and install the following packages for your device:');
          system.packageAtoms.forEach(pkg => {
            addToHistory(` * ${pkg}`);
          });
          addToHistory('\nProceed? (y/N)');
        } else {
          addToHistory(`Invalid choice. Please enter a number between 1 and ${systems.length}.`);
        }
        break;

      case STATES.CONFIRM_DOWNLOAD:
        if (value.toLowerCase() === 'y') {
          setState(STATES.DOWNLOADING);
          simulateDownload();
        } else if (value.toLowerCase() === 'n') {
          addToHistory('\nExiting. You can restart the wizard whenever prepared.\n');
          setState(STATES.RESTART);
        } else {
          addToHistory("Unrecognized input '" + value + "'.");
          addToHistory("Accepted choices: Y/y/yes for YES, N/n/no for NO.");
        }
        break;

      case STATES.DISK_PATH:
        if (value.startsWith('/dev/')) {
          simulateFlashing();
        } else {
          addToHistory("'" + value + "' is not a path to an existing file.");
          addToHistory("Please give the path for the target's whole disk: ");
        }
        break;

      case STATES.COMPLETE:
        if (value.toLowerCase() === 'y') {
          // 清除历史记录
          setHistory([{ type: 'output', text: WELCOME_MESSAGE }]);
          setState(STATES.WELCOME);
          setSelectedDevice(null);
          setSelectedVariant(null);
          setSelectedSystem(null);
          setDownloadProgress(null);
          setError(null);
          setDevices([]);
        } else if (value.toLowerCase() === 'n') {
          addToHistory('\nThank you for using RuyiSDK Device Provisioning Wizard!\n');
        } else {
          addToHistory("Unrecognized input '" + value + "'.");
          addToHistory("Accepted choices: Y/y/yes for YES, N/n/no for NO.");
        }
        break;

      default:
        break;
    }
  }, [state, input, addToHistory, simulateDownload, simulateFlashing, devices, variants, systems, selectedDevice]);

  return {
    history,
    input,
    onInputChange,
    onInputSubmit,
    error,
    downloadProgress
  };
} 