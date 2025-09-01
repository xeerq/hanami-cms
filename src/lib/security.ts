// Security utilities for password validation and other security checks

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  let score = 0;

  // Minimum length check
  if (password.length < 8) {
    errors.push('Hasło musi mieć co najmniej 8 znaków');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push('Hasło musi zawierać co najmniej jedną wielką literę');
  } else {
    score += 1;
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push('Hasło musi zawierać co najmniej jedną małą literę');
  } else {
    score += 1;
  }

  // Number check
  if (!/\d/.test(password)) {
    errors.push('Hasło musi zawierać co najmniej jedną cyfrę');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Hasło musi zawierać co najmniej jeden znak specjalny (!@#$%^&* itp.)');
  } else {
    score += 1;
  }

  // Common password patterns check
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /admin/i,
    /letmein/i,
    /welcome/i,
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    errors.push('Hasło nie może zawierać popularnych wzorców');
    score = Math.max(0, score - 2);
  }

  // Sequential characters check
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Hasło nie może zawierać więcej niż 2 takich samych znaków pod rząd');
    score = Math.max(0, score - 1);
  }

  let strength: 'weak' | 'medium' | 'strong';
  if (score >= 5) {
    strength = 'strong';
  } else if (score >= 3) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  return {
    isValid: errors.length === 0 && score >= 4,
    errors,
    strength,
  };
};

export const sanitizeInput = (input: string): string => {
  // Basic XSS prevention
  return input
    .replace(/[<>]/g, '')
    .trim();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Polish phone number validation
  const phoneRegex = /^(\+48\s?)?[\d\s\-]{8,12}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const getPasswordStrengthColor = (strength: 'weak' | 'medium' | 'strong'): string => {
  switch (strength) {
    case 'weak':
      return 'text-destructive';
    case 'medium':
      return 'text-yellow-600';
    case 'strong':
      return 'text-green-600';
  }
};

export const getPasswordStrengthText = (strength: 'weak' | 'medium' | 'strong'): string => {
  switch (strength) {
    case 'weak':
      return 'Słabe';
    case 'medium':
      return 'Średnie';
    case 'strong':
      return 'Silne';
  }
};