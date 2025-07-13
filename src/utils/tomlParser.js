import TOML from '@ltd/j-toml';
import { deviceFiles } from '../config/devices';
import { imageComboFiles } from '../config/imageComboList';
import { deviceVariants } from '../config/deviceVariants';

export async function readTomlFile(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    return TOML.parse(text, { joiner: '\n' });
  } catch (error) {
    console.error(`Error reading TOML file ${path}:`, error);
    return null;
  }
}

export async function readAllDevices() {
  const devices = [];
  try {
    for (const file of deviceFiles) {
      const device = await readTomlFile(`/entities/device/${file}`);
      if (device) {
        devices.push({
          id: device.device.id,
          displayName: device.device.display_name,
          related: device.related
        });
      }
    }
    
    if (devices.length === 0) {
      throw new Error('No devices found in configuration');
    }
  } catch (error) {
    console.error('Error reading devices:', error);
    throw error;
  }
  
  return devices.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function readDeviceVariants(deviceId) {
  const variants = [];
  try {
    const device = await readTomlFile(`/entities/device/${deviceId}.toml`);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const variantFiles = deviceVariants[deviceId];
    if (!variantFiles || variantFiles.length === 0) {
      throw new Error(`No variants found for device ${deviceId}`);
    }

    for (const variantFile of variantFiles) {
      const variant = await readTomlFile(`/entities/device-variant/${variantFile}`);
      if (variant) {
        variants.push({
          id: variant['device-variant'].id,
          variantName: variant['device-variant'].variant_name,
          related: variant.related,
          fullId: variantFile.replace('.toml', '')
        });
      }
    }

    if (variants.length === 0) {
      throw new Error(`No variants found for device ${deviceId}`);
    }
  } catch (error) {
    console.error('Error reading variants:', error);
    throw error;
  }
  
  return variants.sort((a, b) => a.variantName.localeCompare(b.variantName));
}

export async function readImageCombos(deviceId, variantId) {
  const combos = [];
  try {
    const variant = await readTomlFile(`/entities/device-variant/${deviceId}@${variantId}.toml`);
    if (!variant) {
      throw new Error(`Variant ${deviceId}@${variantId} not found`);
    }

    const variantRef = `device-variant:${deviceId}@${variantId}`;
    
    for (const file of imageComboFiles) {
      try {
        const combo = await readTomlFile(`/entities/image-combo/${file}`);
        if (combo && Array.isArray(combo.related) && combo.related.includes(variantRef)) {
          combos.push({
            id: file.replace('.toml', ''),
            displayName: combo['image-combo'].display_name,
            packageAtoms: combo['image-combo'].package_atoms || [],
            postinstMessage: combo['image-combo'].postinst_msgid
          });
        }
      } catch (error) {
        // Silently skip files that don't exist or can't be parsed
        continue;
      }
    }

    if (combos.length === 0) {
      throw new Error(`No system configurations found for variant ${deviceId}@${variantId}`);
    }
  } catch (error) {
    console.error('Error reading image combos:', error);
    throw error;
  }
  
  return combos.sort((a, b) => a.displayName.localeCompare(b.displayName));
} 