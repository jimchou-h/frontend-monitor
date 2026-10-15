export interface ParsedUA {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
}

export function parseUA(ua: string): ParsedUA {
  const u = ua || '';
  let browser = 'unknown';
  let browserVersion = '';
  let os = 'unknown';
  let osVersion = '';
  let device = 'unknown';
  let deviceType: ParsedUA['deviceType'] = 'unknown';

  const patterns: Array<[RegExp, (m: RegExpMatchArray) => void]> = [
    [/MicroMessenger\/([\d.]+)/, (m) => ((browser = 'wechat'), (browserVersion = m[1]))],
    [/Edg\/([\d.]+)/, (m) => ((browser = 'edge'), (browserVersion = m[1]))],
    [/OPR\/([\d.]+)/, (m) => ((browser = 'opera'), (browserVersion = m[1]))],
    [/Chrome\/([\d.]+)/, (m) => ((browser = 'chrome'), (browserVersion = m[1]))],
    [/Safari\/([\d.]+)/, (m) => ((browser = 'safari'), (browserVersion = m[1]))],
    [/Firefox\/([\d.]+)/, (m) => ((browser = 'firefox'), (browserVersion = m[1]))],
    [/MSIE ([\d.]+)/, (m) => ((browser = 'ie'), (browserVersion = m[1]))],
  ];
  for (const [re, apply] of patterns) {
    const m = u.match(re);
    if (m) {
      apply(m);
      break;
    }
  }

  const osPatterns: Array<[RegExp, (m: RegExpMatchArray) => void]> = [
    [/Windows NT ([\d.]+)/, (m) => ((os = 'windows'), (osVersion = m[1]))],
    [/Mac OS X ([\d_.]+)/, (m) => ((os = 'macos'), (osVersion = m[1].replace(/_/g, '.')))],
    [/Android ([\d.]+)/, (m) => ((os = 'android'), (osVersion = m[1]))],
    [/iPhone OS ([\d_]+)/, (m) => ((os = 'ios'), (osVersion = m[1].replace(/_/g, '.')))],
    [/iPad.*OS ([\d_]+)/, (m) => ((os = 'ios'), (osVersion = m[1].replace(/_/g, '.')))],
    [/Linux/, () => ((os = 'linux'), (osVersion = ''))],
  ];
  for (const [re, apply] of osPatterns) {
    const m = u.match(re);
    if (m) {
      apply(m);
      break;
    }
  }

  if (/iPhone|Android/.test(u)) {
    deviceType = 'mobile';
    const modelMatch = u.match(/\(([^)]+)\)/);
    device = modelMatch ? modelMatch[1] : os;
  } else if (/iPad|Tablet/.test(u)) {
    deviceType = 'tablet';
    device = 'tablet';
  } else if (/Windows|Macintosh|X11/.test(u)) {
    deviceType = 'desktop';
    device = os;
  }

  return { browser, browserVersion, os, osVersion, device, deviceType };
}
