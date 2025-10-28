export type PasswordValidationResult = {
  isValid: boolean;
  errors: string[];
};

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Minimum 8 characters
  if (password.length < 8) {
    errors.push('Hasło musi mieć minimum 8 znaków');
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Hasło musi zawierać wielką literę');
  }

  // At least one digit
  if (!/\d/.test(password)) {
    errors.push('Hasło musi zawierać cyfrę');
  }

  // At least one special character (safe characters only)
  // Safe special characters: @$!%*?&#_-+=
  if (!/[@$!%*?&#_\-+=]/.test(password)) {
    errors.push('Hasło musi zawierać znak specjalny (@$!%*?&#_-+=)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
} {
  let score = 0;

  // Length
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Complexity
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/@$!%*?&#_\-+=/.test(password)) score++;

  // Variety
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= 8) score++;

  if (score <= 3) return { strength: 'weak', score };
  if (score <= 5) return { strength: 'medium', score };
  if (score <= 7) return { strength: 'strong', score };
  return { strength: 'very-strong', score };
}
