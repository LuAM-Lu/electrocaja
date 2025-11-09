import { createElement } from 'react';
import baseToast, { Toaster as BaseToaster } from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle
} from 'lucide-react';

const baseStyle = {
  borderRadius: '14px',
  padding: '12px 14px',
  fontSize: '0.85rem',
  lineHeight: 1.4,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  boxShadow: '0 18px 35px rgba(15, 23, 42, 0.12)',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  maxWidth: 'min(360px, calc(100vw - 32px))',
  width: 'auto',
  backdropFilter: 'blur(6px)'
};

const variantConfig = {
  success: {
    icon: CheckCircle2,
    duration: 3200,
    style: {
      background: '#F0FDF4',
      borderColor: '#86EFAC',
      color: '#065F46'
    }
  },
  error: {
    icon: XCircle,
    duration: 4200,
    style: {
      background: '#FEF2F2',
      borderColor: '#FCA5A5',
      color: '#7F1D1D'
    }
  },
  warning: {
    icon: AlertTriangle,
    duration: 4000,
    style: {
      background: '#FFFBEB',
      borderColor: '#FBD38D',
      color: '#92400E'
    }
  },
  info: {
    icon: Info,
    duration: 3600,
    style: {
      background: '#EFF6FF',
      borderColor: '#BFDBFE',
      color: '#1E3A8A'
    }
  },
  loading: {
    icon: Loader2,
    iconClassName: 'animate-spin',
    duration: 60000,
    style: {
      background: '#F8FAFC',
      borderColor: '#CBD5F5',
      color: '#0F172A'
    }
  },
  neutral: {
    icon: Info,
    duration: 3600,
    style: {
      background: '#F8FAFC',
      borderColor: '#E2E8F0',
      color: '#1F2937'
    }
  }
};

const buildOptions = (variant = 'info', overrides = {}) => {
  const config = variantConfig[variant] ?? variantConfig.info;
  const {
    icon: iconOverride,
    duration: durationOverride,
    ...restOverrides
  } = overrides || {};
  if ('style' in restOverrides) {
    delete restOverrides.style;
  }

  const iconElement =
    iconOverride ??
    (config.icon
      ? createElement(config.icon, {
          className: `h-4 w-4 text-current flex-shrink-0 ${
            config.iconClassName ?? ''
          }`.trim()
        })
      : undefined);

  const style = {
    ...baseStyle,
    ...config.style
  };

  return {
    duration: durationOverride ?? config.duration,
    icon: iconElement,
    style,
    ...restOverrides
  };
};

const toast = (message, options) =>
  baseToast(message, buildOptions('info', options));

toast.success = (message, options) =>
  baseToast.success(message, buildOptions('success', options));

toast.error = (message, options) =>
  baseToast.error(message, buildOptions('error', options));

toast.warning = (message, options) =>
  baseToast(message, buildOptions('warning', options));

toast.info = (message, options) =>
  baseToast(message, buildOptions('info', options));

toast.loading = (message, options) =>
  baseToast.loading(message, buildOptions('loading', options));

toast.dismiss = baseToast.dismiss;
toast.remove = baseToast.remove;
toast.promise = baseToast.promise;
toast.custom = baseToast.custom;
toast.isActive = baseToast.isActive;

export const Toaster = (props) => (
  <BaseToaster
    position="top-right"
    gutter={12}
    toastOptions={{
      ...buildOptions('info'),
      success: buildOptions('success'),
      error: buildOptions('error'),
      loading: buildOptions('loading')
    }}
    {...props}
  />
);

export default toast;
