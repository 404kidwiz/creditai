'use client';

import { forwardRef, useId } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn } from '@/lib/animations/variants';

// Form Field Container
interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export function FormField({ children, className }: FormFieldProps) {
  return (
    <motion.div
      className={cn('space-y-2', className)}
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
}

// Form Label
interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

export const FormLabel = forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="ml-1 text-destructive" aria-label="required">
            *
          </span>
        )}
      </label>
    );
  }
);

FormLabel.displayName = 'FormLabel';

// Form Input
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  description?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, type, error, description, id, ...props }, ref) => {
    const inputId = useId();
    const actualId = id || inputId;
    const errorId = `${actualId}-error`;
    const descriptionId = `${actualId}-description`;

    return (
      <>
        <input
          id={actualId}
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(
            description && descriptionId,
            error && errorId
          )}
          {...props}
        />
        {description && (
          <p
            id={descriptionId}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}
        {error && (
          <motion.p
            id={errorId}
            className="text-sm text-destructive flex items-center gap-1"
            role="alert"
            aria-live="polite"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.p>
        )}
      </>
    );
  }
);

FormInput.displayName = 'FormInput';

// Form Textarea
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  description?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, error, description, id, ...props }, ref) => {
    const textareaId = useId();
    const actualId = id || textareaId;
    const errorId = `${actualId}-error`;
    const descriptionId = `${actualId}-description`;

    return (
      <>
        <textarea
          id={actualId}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(
            description && descriptionId,
            error && errorId
          )}
          {...props}
        />
        {description && (
          <p
            id={descriptionId}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}
        {error && (
          <motion.p
            id={errorId}
            className="text-sm text-destructive flex items-center gap-1"
            role="alert"
            aria-live="polite"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.p>
        )}
      </>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

// Form Select
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  description?: string;
  children: React.ReactNode;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, error, description, id, children, ...props }, ref) => {
    const selectId = useId();
    const actualId = id || selectId;
    const errorId = `${actualId}-error`;
    const descriptionId = `${actualId}-description`;

    return (
      <>
        <select
          id={actualId}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(
            description && descriptionId,
            error && errorId
          )}
          {...props}
        >
          {children}
        </select>
        {description && (
          <p
            id={descriptionId}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}
        {error && (
          <motion.p
            id={errorId}
            className="text-sm text-destructive flex items-center gap-1"
            role="alert"
            aria-live="polite"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.p>
        )}
      </>
    );
  }
);

FormSelect.displayName = 'FormSelect';

// Form Checkbox
interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ className, label, description, error, id, ...props }, ref) => {
    const checkboxId = useId();
    const actualId = id || checkboxId;
    const errorId = `${actualId}-error`;
    const descriptionId = `${actualId}-description`;

    return (
      <div className="space-y-2">
        <div className="flex items-start space-x-2">
          <input
            id={actualId}
            type="checkbox"
            className={cn(
              'mt-1 h-4 w-4 rounded border border-input bg-background text-primary',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive',
              className
            )}
            ref={ref}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(
              description && descriptionId,
              error && errorId
            )}
            {...props}
          />
          <div className="flex-1 space-y-1">
            <label
              htmlFor={actualId}
              className="text-sm font-medium leading-none cursor-pointer"
            >
              {label}
            </label>
            {description && (
              <p
                id={descriptionId}
                className="text-sm text-muted-foreground"
              >
                {description}
              </p>
            )}
          </div>
        </div>
        {error && (
          <motion.p
            id={errorId}
            className="text-sm text-destructive flex items-center gap-1 ml-6"
            role="alert"
            aria-live="polite"
            variants={fadeIn}
            initial="initial"
            animate="animate"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';

// Form Message (for success, info, etc.)
interface FormMessageProps {
  type: 'success' | 'info' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}

export function FormMessage({ type, children, className }: FormMessageProps) {
  const icons = {
    success: <CheckCircle className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
    warning: <AlertCircle className="h-4 w-4" />,
    error: <AlertCircle className="h-4 w-4" />,
  };

  const styles = {
    success: 'text-green-600 bg-green-50 border-green-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    error: 'text-destructive bg-destructive/10 border-destructive/20',
  };

  return (
    <motion.div
      className={cn(
        'flex items-center gap-2 p-3 rounded-md border text-sm',
        styles[type],
        className
      )}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {icons[type]}
      {children}
    </motion.div>
  );
}