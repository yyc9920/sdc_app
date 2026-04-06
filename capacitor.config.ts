import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sdc.englishstudy',
  appName: 'SDC English Study',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    packageManager: 'cocoapods',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
