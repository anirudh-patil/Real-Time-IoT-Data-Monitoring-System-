function humanizeType(type) {
  return type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function buildAlertRaisedTemplate({ device, alert }) {
  const subject = `[${alert.severity.toUpperCase()}] ${humanizeType(alert.type)} - ${device.name}`;
  const text = [
    `An alert was triggered on device "${device.name}".`,
    '',
    `Type: ${humanizeType(alert.type)}`,
    `Severity: ${alert.severity}`,
    `Details: ${alert.message}`,
    `Triggered at: ${alert.createdAt}`,
  ].join('\n');
  return { subject, text };
}

export function buildAlertResolvedTemplate({ device, alert }) {
  const subject = `[RESOLVED] ${humanizeType(alert.type)} - ${device.name}`;
  const text = [
    `The alert on device "${device.name}" has been resolved.`,
    '',
    `Type: ${humanizeType(alert.type)}`,
    `Resolved at: ${alert.resolvedAt}`,
  ].join('\n');
  return { subject, text };
}
