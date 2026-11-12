import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Toaster, toast } from '../src/components/Toast';
import { supabaseErrorAr } from '../src/lib/supabaseErrors';
import { normalizeTestType, supportsStandingJumpModels, ALL_TEST_TYPES } from '../src/lib/testTypes';

describe('toast', () => {
  it('renders messages pushed from outside React', () => {
    render(<Toaster />);
    act(() => { toast.success('تم الحفظ'); });
    expect(screen.getByText('تم الحفظ')).toBeInTheDocument();
  });
});

describe('Supabase errors in Arabic', () => {
  it('maps RLS / constraint / network errors', () => {
    expect(supabaseErrorAr({ code: '42501', message: 'new row violates row-level security' }, 'حفظ القياس')).toMatch(/كود الدخول/);
    expect(supabaseErrorAr({ code: '23514', message: 'check' })).toMatch(/غير مسموح/);
    expect(supabaseErrorAr(new TypeError('Failed to fetch'))).toMatch(/الإنترنت/);
  });
});

describe('test types', () => {
  it('normalizes legacy spellings', () => {
    expect(normalizeTestType('cmj')).toBe('cmj_arms');
    expect(normalizeTestType('standard')).toBe('cmj_arms');
    expect(normalizeTestType('cmj_no_arm')).toBe('cmj_no_arms');
    expect(normalizeTestType('approach_jump')).toBe('approach');
    expect(normalizeTestType('sj')).toBe('sj_no_arms');
    expect(normalizeTestType('clean')).toBe('power_clean');
    expect(ALL_TEST_TYPES).toHaveLength(9);
  });
  it('limits standing-jump models to SJ/CMJ', () => {
    expect(supportsStandingJumpModels('cmj')).toBe(true);
    expect(supportsStandingJumpModels('approach')).toBe(false);
    expect(supportsStandingJumpModels('rsi')).toBe(false);
  });
});
