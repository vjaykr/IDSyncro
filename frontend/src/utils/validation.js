// Real-time format validation with progressive feedback
// Real-time format validation with progressive feedback
export const validateField = (fieldName, value) => {
  const rules = {
    name: {
      required: true,
      pattern: /^[a-zA-Z\s]{2,100}$/,
      message: 'Name must be 2-100 characters, letters and spaces only'
    },
    
    designation: {
      required: true,
      pattern: /^[a-zA-Z\s-]{2,50}$/,
      message: 'Designation must be 2-50 characters, letters, spaces, and hyphens only'
    },
    department: {
      required: true,
      pattern: /^[a-zA-Z\s]{2,50}$/,
      message: 'Department must be 2-50 characters, letters and spaces only'
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Enter a valid email address'
    },
    phone: {
      required: true,
      pattern: /^[6-9][0-9]{9}$/,
      message: 'Phone must start with 6-9 and be exactly 10 digits'
    },
    aadhar_number: {
      pattern: /^[2-9][0-9]{11}$/,
      message: 'Aadhar must be 12 digits, cannot start with 0 or 1'
    },
    pan_number: {
      pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      message: 'PAN format: ABCDE1234F (5 letters, 4 digits, 1 letter)'
    },
    emergency_phone: {
      pattern: /^[6-9][0-9]{9}$/,
      message: 'Emergency phone must start with 6-9 and be exactly 10 digits'
    },
    salary: {
      pattern: /^[1-9][0-9]*$/,
      message: 'Salary must be a positive number without decimals'
    },
    bank_account: {
      pattern: /^[0-9]{9,18}$/,
      message: 'Bank account must be 9-18 digits'
    },
    employment_type: {
      required: true,
      message: 'Employment type is required'
    },
    work_location: {
      required: true,
      pattern: /^[a-zA-Z\s-]{2,50}$/,
      message: 'Work location must be 2-50 characters, letters, spaces, and hyphens only'
    }
  };

  const rule = rules[fieldName];
  if (!rule) return { valid: true };

  if (rule.required && (!value || value.toString().trim() === '')) {
    return { valid: false, error: `${fieldName.replace('_', ' ')} is required` };
  }

  if (!value || value.toString().trim() === '') {
    return { valid: true };
  }

  // Real-time progressive validation
  const trimmedValue = value.toString().trim();
  
  // PAN Number validation - only show errors for wrong format
  if (fieldName === 'pan_number') {
    const panValue = trimmedValue.toUpperCase();
    if (panValue.length === 0) return { valid: true };
    
    // Check format and show error only if wrong
    if (panValue.length <= 5 && !/^[A-Z]*$/.test(panValue)) {
      return { valid: false, error: 'Check format: ABCDE1234F (5 letters + 4 digits + 1 letter)' };
    }
    
    if (panValue.length > 5 && panValue.length <= 9 && !/^[A-Z]{5}[0-9]*$/.test(panValue)) {
      return { valid: false, error: 'Check format: ABCDE1234F (5 letters + 4 digits + 1 letter)' };
    }
    
    if (panValue.length === 10 && !rule.pattern.test(panValue)) {
      return { valid: false, error: 'Check format: ABCDE1234F (5 letters + 4 digits + 1 letter)' };
    }
    
    if (panValue.length > 10) {
      return { valid: false, error: 'Check format: ABCDE1234F (5 letters + 4 digits + 1 letter)' };
    }
    
    return { valid: true };
  }
  
  // Aadhar Number progressive validation
  if (fieldName === 'aadhar_number') {
    if (trimmedValue.length === 0) return { valid: true };
    
    if (!/^[0-9]*$/.test(trimmedValue)) {
      return { valid: false, error: 'Aadhar must contain only digits' };
    }
    
    if (trimmedValue.length === 1 && (trimmedValue === '0' || trimmedValue === '1')) {
      return { valid: false, error: 'Aadhar cannot start with 0 or 1' };
    }
    
    if (trimmedValue.length < 12) {
      return { valid: true, progress: `${trimmedValue.length}/12 digits entered` };
    }
    
    if (trimmedValue.length === 12) {
      if (rule.pattern.test(trimmedValue)) {
        return { valid: true, progress: 'Valid Aadhar format ✓' };
      }
    }
  }
  
  // Phone Number progressive validation
  if (fieldName === 'phone' || fieldName === 'emergency_phone') {
    if (trimmedValue.length === 0) return { valid: true };
    
    if (!/^[0-9]*$/.test(trimmedValue)) {
      return { valid: false, error: 'Phone must contain only digits' };
    }
    
    if (trimmedValue.length === 1 && !/^[6-9]$/.test(trimmedValue)) {
      return { valid: false, error: 'Phone must start with 6, 7, 8, or 9' };
    }
    
    if (trimmedValue.length < 10) {
      return { valid: true, progress: `${trimmedValue.length}/10 digits entered` };
    }
    
    if (trimmedValue.length === 10) {
      if (rule.pattern.test(trimmedValue)) {
        return { valid: true, progress: 'Valid phone format ✓' };
      }
    }
  }
  
  // Bank Account progressive validation
  if (fieldName === 'bank_account') {
    if (trimmedValue.length === 0) return { valid: true };
    
    if (!/^[0-9]*$/.test(trimmedValue)) {
      return { valid: false, error: 'Bank account must contain only digits' };
    }
    
    if (trimmedValue.length < 9) {
      return { valid: true, progress: `${trimmedValue.length}/9 minimum digits entered` };
    }
    
    if (trimmedValue.length >= 9 && trimmedValue.length <= 18) {
      return { valid: true, progress: `Valid bank account format ✓` };
    }
    
    if (trimmedValue.length > 18) {
      return { valid: false, error: 'Bank account cannot exceed 18 digits' };
    }
  }
  
  // Email progressive validation
  if (fieldName === 'email') {
    if (trimmedValue.length === 0) return { valid: true };
    
    if (!trimmedValue.includes('@')) {
      return { valid: true, progress: 'Enter @ symbol' };
    }
    
    const parts = trimmedValue.split('@');
    if (parts.length === 2 && parts[1] && !parts[1].includes('.')) {
      return { valid: true, progress: 'Enter domain with .' };
    }
    
    if (rule.pattern.test(trimmedValue)) {
      return { valid: true, progress: 'Valid email format ✓' };
    }
  }

  // Standard pattern validation
  if (rule.pattern && !rule.pattern.test(trimmedValue)) {
    return { valid: false, error: rule.message };
  }

  // Date validations
  if (fieldName === 'date_of_birth' && value) {
    const date = new Date(value);
    const age = new Date().getFullYear() - date.getFullYear();
    if (age < 18 || age > 100) {
      return { valid: false, error: 'Age must be between 18-100 years' };
    }
  }

  if (fieldName === 'joining_date' && value) {
    const date = new Date(value);
    if (date > new Date()) {
      return { valid: false, error: 'Joining date cannot be in future' };
    }
  }

  return { valid: true };
};

// Format input values in real-time
export const formatInput = (fieldName, value) => {
  switch (fieldName) {
    case 'pan_number':
      // More restrictive PAN formatting with position-based validation
      const panValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      let formatted = '';
      
      for (let i = 0; i < panValue.length; i++) {
        const char = panValue[i];
        if (i < 5) {
          // Positions 1-5: Only letters
          if (/[A-Z]/.test(char)) formatted += char;
        } else if (i < 9) {
          // Positions 6-9: Only digits
          if (/[0-9]/.test(char)) formatted += char;
        } else {
          // Position 10: Only letter
          if (/[A-Z]/.test(char)) formatted += char;
        }
      }
      return formatted;
    
    case 'aadhar_number':
    case 'phone':
    case 'emergency_phone':
    case 'bank_account':
      return value.replace(/[^0-9]/g, '');
    
    case 'salary':
      return value.replace(/[^0-9]/g, '');
    
    case 'name':
    case 'designation':
    case 'department':
    case 'emergency_contact':
    case 'manager':
    case 'work_location':
      return value.replace(/[^a-zA-Z\s-]/g, '');
    
    default:
      return value;
  }
};

// Get PAN input placeholder based on current length
export const getPanPlaceholder = (currentValue) => {
  const len = currentValue ? currentValue.length : 0;
  const template = 'ABCDE1234F';
  
  if (len === 0) return 'ABCDE1234F';
  if (len < 10) {
    return currentValue + template.slice(len);
  }
  return currentValue;
};