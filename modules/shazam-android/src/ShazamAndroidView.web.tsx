import * as React from 'react';

import { ShazamAndroidViewProps } from './ShazamAndroid.types';

export default function ShazamAndroidView(props: ShazamAndroidViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
