import { describe, expect, it } from '@jest/globals';
import { Platform } from 'react-native';

import { DEFAULT_MAIL_SUBJECT, mailtoUrl, messageChannels, smsUrl, whatsappUrl } from '../channels';

/** Contains every character a URL treats as structure, plus a newline and a multi-byte dash. */
const AWKWARD = 'Fall & cut? #2 = bad\nSecond line — with a dash';

function decodedBody(url: string): string {
  return decodeURIComponent(url.slice(url.indexOf('body=') + 'body='.length));
}

describe('smsUrl', () => {
  it('attaches the body with the separator the platform wants', () => {
    // Apple documents `&body=`; Android expects `?body=`. Both are exercised rather than assumed.
    expect(smsUrl('hello', '', '?')).toBe('sms:?body=hello');
    expect(smsUrl('hello', '', '&')).toBe('sms:&body=hello');
  });

  it('defaults to the separator for this platform', () => {
    expect(smsUrl('hello')).toBe(`sms:${Platform.OS === 'ios' ? '&' : '?'}body=hello`);
  });

  it('addresses a number when there is one', () => {
    expect(smsUrl('hello', '999', '?')).toBe('sms:999?body=hello');
  });

  it('escapes a body that would otherwise break the URL apart', () => {
    const url = smsUrl(AWKWARD, '999', '?');

    expect(decodedBody(url)).toBe(AWKWARD);
    expect(url).not.toContain('\n');
    expect(url).not.toContain('#');
    expect(url).not.toContain(' ');
  });
});

describe('mailtoUrl', () => {
  it('carries the default subject and the body', () => {
    const url = mailtoUrl('hello');

    expect(url).toBe(`mailto:?subject=${encodeURIComponent(DEFAULT_MAIL_SUBJECT)}&body=hello`);
  });

  it('escapes an awkward subject and body into it', () => {
    const url = mailtoUrl(AWKWARD, 'Handover: scene & casualty?');

    expect(decodedBody(url)).toBe(AWKWARD);
    expect(url).not.toContain('\n');
    expect(url).not.toContain(' ');
  });

  it('takes a subject when the screen has a better one', () => {
    expect(mailtoUrl('x', 'Scene report')).toContain('subject=Scene%20report');
  });
});

describe('whatsappUrl', () => {
  it('uses the text parameter the scheme expects', () => {
    expect(whatsappUrl('hello')).toBe('whatsapp://send?text=hello');
  });

  it('escapes an awkward body into it', () => {
    const url = whatsappUrl(AWKWARD);
    const text = decodeURIComponent(url.slice(url.indexOf('text=') + 'text='.length));

    expect(text).toBe(AWKWARD);
    expect(url).not.toContain('\n');
  });
});

describe('the channels the screen offers', () => {
  it('gives the three the plan names, in order, each with a working URL', () => {
    const channels = messageChannels('hello');

    expect(channels.map((channel) => channel.label)).toEqual(['SMS', 'Email', 'WhatsApp']);
    expect(channels[0]?.url).toMatch(/^sms:/);
    expect(channels[1]?.url).toMatch(/^mailto:/);
    expect(channels[2]?.url).toMatch(/^whatsapp:\/\/send\?text=/);
    for (const channel of channels) {
      expect(channel.url).toContain('hello');
    }
  });

  it('builds every one of them from the same body, so nothing can drift', () => {
    const channels = messageChannels(AWKWARD);

    expect(decodedBody(channels[0]!.url)).toBe(AWKWARD);
    expect(decodedBody(channels[1]!.url)).toBe(AWKWARD);
    expect(decodeURIComponent(channels[2]!.url.split('text=')[1]!)).toBe(AWKWARD);
  });
});
