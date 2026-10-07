export function passwordStrength(pw: string): { score: number; label: string; entropy: number; tips: string[] } {
  const tips: string[] = [];
  if (pw.length === 0) return { score: 0, label: 'Empty', entropy: 0, tips: ['Enter a password to begin.'] };
  let pool = 0;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSym = /[^A-Za-z0-9]/.test(pw);
  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigit) pool += 10;
  if (hasSym) pool += 32;
  if (!hasLower) tips.push('Add lowercase letters.');
  if (!hasUpper) tips.push('Add uppercase letters.');
  if (!hasDigit) tips.push('Add numbers.');
  if (!hasSym) tips.push('Add symbols (!@#$…).');
  if (pw.length < 12) tips.push('Use at least 12 characters.');
  if (pw.length < 16) tips.push('16+ characters resists brute force far better.');
  const entropy = Math.round(pw.length * Math.log2(Math.max(pool, 2)));
  let score = 0;
  if (entropy >= 90 && pw.length >= 14) score = 4;
  else if (entropy >= 60 && pw.length >= 10) score = 3;
  else if (entropy >= 40 && pw.length >= 8) score = 2;
  else if (pw.length > 0) score = 1;
  // Weak / Medium / Strong vocabulary for the visual meter
  const label = ['Empty', 'Weak', 'Medium', 'Strong', 'Very strong'][score]!;
  return { score, label, entropy, tips: tips.slice(0, 2) };
}

export function generatePassword(length = 20): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+';
  const rnd = new Uint32Array(length);
  crypto.getRandomValues(rnd);
  let s = '';
  for (let i = 0; i < length; i++) s += chars[rnd[i]! % chars.length];
  return s;
}
