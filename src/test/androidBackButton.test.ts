import { describe, expect, it } from 'vitest';
import {
  ANDROID_ROOT_TAB_PATHS,
  isAndroidRootTabPath,
} from '@/hooks/useAndroidBackButton';

describe('isAndroidRootTabPath', () => {
  it('returns true for root tab routes', () => {
    for (const path of ANDROID_ROOT_TAB_PATHS) {
      expect(isAndroidRootTabPath(path)).toBe(true);
      expect(isAndroidRootTabPath(`${path}/`)).toBe(true);
    }
  });

  it('returns false for nested and auth routes', () => {
    expect(isAndroidRootTabPath('/reptiles/new')).toBe(false);
    expect(isAndroidRootTabPath('/reptiles/abc-123')).toBe(false);
    expect(isAndroidRootTabPath('/auth')).toBe(false);
    expect(isAndroidRootTabPath('/auth/callback')).toBe(false);
    expect(isAndroidRootTabPath('/genetics')).toBe(false);
    expect(isAndroidRootTabPath('/')).toBe(false);
  });
});
