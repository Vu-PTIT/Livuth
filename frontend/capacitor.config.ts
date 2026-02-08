import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ganvo.app',
  appName: 'Ganvo',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    Geolocation: {
      enableHighAccuracy: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'beep.wav',
    },
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
