import { requireNativeView } from 'expo';
import * as React from 'react';

import { ShazamAndroidViewProps } from './ShazamAndroid.types';

const NativeView: React.ComponentType<ShazamAndroidViewProps> =
  requireNativeView('ShazamAndroid');

export default function ShazamAndroidView(props: ShazamAndroidViewProps) {
  return <NativeView {...props} />;
}
