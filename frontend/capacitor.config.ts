import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ganvo.app',
  appName: 'Ganvo',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
