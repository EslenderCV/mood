import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './ShazamAndroid.types';

type ShazamAndroidModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class ShazamAndroidModule extends NativeModule<ShazamAndroidModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(ShazamAndroidModule, 'ShazamAndroidModule');
