import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.delivr.food',
  appName: 'Delivr',
  webDir: 'web-dist',
  backgroundColor: '#f7f6f2',
  android: { allowMixedContent: false },
};

export default config;
