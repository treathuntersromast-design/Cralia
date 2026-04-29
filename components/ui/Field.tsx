/**
 * Field — フォームフィールドのラベル・ヒント・エラーをまとめるラッパ
 * @example
 * <Field label="表示名" required hint="30文字以内" htmlFor="display-name">
 *   <input id="display-name" />
 * </Field>
 *
 * <Field label="メール" error="メールアドレスが無効です" htmlFor="email">
 *   <input id="email" />
 * </Field>
 */
import React from 'react'
import clsx from 'clsx'

interface FieldProps {
  label?:    string
  hint?:     string
  error?:    string
  required?: boolean
  htmlFor?:  string
  className?: string
  children?:  React.ReactNode
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: FieldProps) {
  const hasError   = !!error
  const messageId  = htmlFor ? `${htmlFor}-message` : undefined

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-semibold text-[var(--c-text-2)] leading-none"
        >
          {label}
          {required && (
            <span className="ml-1 text-[#dc2626]" aria-hidden="true">*</span>
          )}
        </label>
      )}

      {/* 子要素に aria-required / aria-invalid / aria-describedby を注入 */}
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return React.cloneElement(
          child as React.ReactElement<{
            'aria-required'?: boolean
            'aria-invalid'?:  boolean
            'aria-describedby'?: string
          }>,
          {
            ...(required && { 'aria-required': true }),
            ...(hasError  && { 'aria-invalid': true }),
            ...(messageId && (hint || error) && { 'aria-describedby': messageId }),
          },
        )
      })}

      {(hint || error) && (
        <p
          id={messageId}
          className={clsx(
            'text-[12px] leading-snug',
            hasError ? 'text-[#dc2626]' : 'text-[var(--c-text-3)]',
          )}
          role={hasError ? 'alert' : undefined}
          aria-live="polite"
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
