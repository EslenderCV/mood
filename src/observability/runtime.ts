let devPerfLogsEnabled = false;

export const setDevPerfLogsEnabled = (enabled: boolean) => {
  devPerfLogsEnabled = enabled;
};

export const isDevPerfLogsEnabled = () => devPerfLogsEnabled;
