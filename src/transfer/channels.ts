/**
 * The ways a report leaves the phone: the share sheet, and the three schemes worth offering directly.
 *
 * Pure string builders, following `src/emergency/dial.ts` — build the URL here, hand it to `Linking`
 * on the screen, and let the caller own any failure. Kept as functions because the escaping is the
 * part that goes wrong: a handover with an ampersand, a question mark, a hash or a newline in it has
 * to survive the trip, and a string assembled inline on a screen cannot be tested.
 *
 * The share sheet itself is React Native's own `Share`, so none of this needs a dependency.
 */

import { Platform } from 'react-native';

/**
 * How the message body is attached to an `sms:` URL.
 *
 * Apple documents `&body=`; Android's handler expects `?body=`. This is a real platform difference in
 * the URL format rather than a capability question, so branching on it is honest — and it is a
 * parameter so both branches are testable.
 */
const SMS_BODY_SEPARATOR = Platform.OS === 'ios' ? '&' : '?';

export const DEFAULT_MAIL_SUBJECT = 'Field Kit report';

/** `sms:` opens the messaging app with the body ready. An empty number means "choose a recipient". */
export function smsUrl(
  body: string,
  number = '',
  separator: '&' | '?' = SMS_BODY_SEPARATOR,
): string {
  return `sms:${number}${separator}body=${encodeURIComponent(body)}`;
}

export function mailtoUrl(body: string, subject: string = DEFAULT_MAIL_SUBJECT): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function whatsappUrl(body: string): string {
  return `whatsapp://send?text=${encodeURIComponent(body)}`;
}

/** The three the plan names, in the order the screen offers them. */
export function messageChannels(body: string): readonly { label: string; url: string }[] {
  return [
    { label: 'SMS', url: smsUrl(body) },
    { label: 'Email', url: mailtoUrl(body) },
    { label: 'WhatsApp', url: whatsappUrl(body) },
  ];
}
