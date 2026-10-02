'use client';

import {
  SECRET_MASK,
  TURNSTILE_MAX_HEADERS,
  TURNSTILE_METHODS,
  TURNSTILE_PLACEHOLDERS,
  type UpdateTurnstileConfigInput,
  UpdateTurnstileConfigInputSchema,
} from '@cadence/shared/schemas/turnstile';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, LockIcon, PlayIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAppAbility } from '@/abilities';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';

const FAILURE_MESSAGES = {
  not_configured: 'Nothing is saved yet, so no request was sent.',
  http_error: 'The turnstile API answered with an error.',
  timeout: 'The turnstile API did not answer within 5 seconds.',
  network_error: 'The turnstile API could not be reached.',
} as const;

const BODY_EXAMPLE = '{"user": "{{memberId}}"}';

function emptyHeader() {
  return { name: '', value: '', secret: false };
}

function TurnstileSettingsSkeleton() {
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Skeleton className="h-6 w-56" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex gap-3 border-t pt-6">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}

function TurnstileSettingsRoot() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ability = useAppAbility();
  const canManage = ability.can('manage', 'TurnstileConfig');

  const configQuery = useQuery({ ...trpc.turnstile.getConfig.queryOptions(), enabled: canManage });
  const config = configQuery.data;

  const form = useForm<UpdateTurnstileConfigInput>({
    resolver: zodResolver(UpdateTurnstileConfigInputSchema),
    defaultValues: { method: 'POST', url: '', headers: [], bodyTemplate: '' },
  });
  const headers = useFieldArray({ control: form.control, name: 'headers' });
  const method = form.watch('method');

  useEffect(() => {
    if (config) {
      form.reset({
        method: config.method,
        url: config.url,
        headers: config.headers,
        bodyTemplate: config.bodyTemplate,
      });
    }
  }, [config, form]);

  const save = useMutation(
    trpc.turnstile.updateConfig.mutationOptions({
      onSuccess: (saved) => {
        queryClient.setQueryData(trpc.turnstile.getConfig.queryKey(), saved);
        toast.success('Turnstile settings saved.');
        test.reset();
      },
      onError: (error) =>
        toast.error(error.data?.code === 'BAD_REQUEST' ? error.message : "We couldn't save the settings. Try again."),
    }),
  );

  const test = useMutation(
    trpc.turnstile.testConnection.mutationOptions({
      onError: () => toast.error("We couldn't run the test. Try again."),
    }),
  );

  if (!canManage) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={LockIcon}
          title="No access"
          description="Your account doesn't include turnstile configuration. Ask an admin if you need it."
        />
      </div>
    );
  }

  if (configQuery.isPending) {
    return (
      <Deferred>
        <TurnstileSettingsSkeleton />
      </Deferred>
    );
  }

  if (configQuery.isError) {
    return (
      <QueryError
        title="We couldn't load the settings"
        onRetry={() => configQuery.refetch()}
        isRetrying={configQuery.isRefetching}
      />
    );
  }

  const canTest = config.isConfigured && !form.formState.isDirty && !save.isPending;
  const testResult = test.data;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
      className="flex max-w-3xl flex-col gap-8"
    >
      <div className="flex flex-wrap items-center gap-3">
        {config.isConfigured ? (
          <Badge variant="live">
            <CheckIcon data-icon="inline-start" />
            Configured
          </Badge>
        ) : (
          <Badge variant="retry">
            <TriangleAlertIcon data-icon="inline-start" />
            Not configured
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {config.isConfigured
            ? `Last saved ${formatDateTime(config.updatedAt)}`
            : 'Check-ins are tagged failed until this is saved.'}
        </span>
      </div>

      <Field data-invalid={Boolean(form.formState.errors.url || form.formState.errors.method)}>
        <FieldLabel htmlFor="turnstile-url">Request</FieldLabel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Controller
            name="method"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="sm:w-28" aria-label="HTTP method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TURNSTILE_METHODS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <Input
            {...form.register('url')}
            id="turnstile-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://turnstile.example.com/doors/3/unlock"
            aria-invalid={Boolean(form.formState.errors.url)}
            className="flex-1"
          />
        </div>
        {config.isConfigured && (
          <FieldDescription>Query values show only their last four characters once saved.</FieldDescription>
        )}
        {form.formState.errors.url && <FieldError errors={[form.formState.errors.url]} />}
      </Field>

      <Field>
        <div className="flex items-center justify-between gap-3">
          <FieldLabel>Headers</FieldLabel>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={headers.fields.length >= TURNSTILE_MAX_HEADERS}
            onClick={() => headers.append(emptyHeader())}
          >
            <PlusIcon data-icon="inline-start" />
            Add header
          </Button>
        </div>
        {headers.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">None. Add a key, token or Content-Type if the API needs one.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {headers.fields.map((item, index) => {
              const rowErrors = form.formState.errors.headers?.[index];
              return (
                <li key={item.id} className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      {...form.register(`headers.${index}.name`)}
                      aria-label={`Header ${index + 1} name`}
                      placeholder="Authorization"
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={Boolean(rowErrors?.name)}
                      className="sm:w-48"
                    />
                    <Controller
                      name={`headers.${index}.secret`}
                      control={form.control}
                      render={({ field: secretField }) => (
                        <Input
                          {...form.register(`headers.${index}.value`)}
                          aria-label={`Header ${index + 1} value`}
                          type={secretField.value ? 'password' : 'text'}
                          placeholder="Bearer abc123"
                          autoComplete="off"
                          spellCheck={false}
                          aria-invalid={Boolean(rowErrors?.value)}
                          className="flex-1"
                        />
                      )}
                    />
                    <div className="flex items-center justify-between gap-2 sm:justify-start">
                      <Controller
                        name={`headers.${index}.secret`}
                        control={form.control}
                        render={({ field: secretField }) => (
                          <div className="flex items-center gap-2" title="Hidden once saved">
                            <Switch
                              id={`turnstile-header-secret-${item.id}`}
                              checked={secretField.value}
                              onCheckedChange={(checked) => {
                                secretField.onChange(checked);
                                if (!checked && form.getValues(`headers.${index}.value`).startsWith(SECRET_MASK)) {
                                  form.setValue(`headers.${index}.value`, '', { shouldDirty: true });
                                }
                              }}
                            />
                            <label htmlFor={`turnstile-header-secret-${item.id}`} className="text-sm">
                              Secret
                            </label>
                          </div>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove header ${index + 1}`}
                        onClick={() => headers.remove(index)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
                  {(rowErrors?.name || rowErrors?.value) && <FieldError errors={[rowErrors.name, rowErrors.value]} />}
                </li>
              );
            })}
          </ul>
        )}
        {form.formState.errors.headers?.root && <FieldError errors={[form.formState.errors.headers.root]} />}
        {form.formState.errors.headers?.message && <FieldError errors={[form.formState.errors.headers]} />}
      </Field>

      <Field data-invalid={Boolean(form.formState.errors.bodyTemplate)}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <FieldLabel htmlFor="turnstile-body">Body (optional)</FieldLabel>
          <div className="flex items-center gap-1">
            {TURNSTILE_PLACEHOLDERS.map((name) => (
              <Button
                key={name}
                type="button"
                variant="outline"
                size="xs"
                disabled={method === 'GET'}
                title="Insert at the end of the body"
                className="font-mono tracking-normal normal-case"
                onClick={() =>
                  form.setValue('bodyTemplate', `${form.getValues('bodyTemplate')}{{${name}}}`, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                {`{{${name}}}`}
              </Button>
            ))}
          </div>
        </div>
        <Textarea
          {...form.register('bodyTemplate')}
          id="turnstile-body"
          rows={4}
          spellCheck={false}
          autoComplete="off"
          disabled={method === 'GET'}
          placeholder={method === 'GET' ? 'A GET request has no body' : BODY_EXAMPLE}
          aria-invalid={Boolean(form.formState.errors.bodyTemplate)}
          className="font-mono"
        />
        {form.formState.errors.bodyTemplate && <FieldError errors={[form.formState.errors.bodyTemplate]} />}
      </Field>

      <div className="flex flex-col gap-4 border-t pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving...' : 'Save settings'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canTest || test.isPending}
            title="Sends the saved request for real, so the turnstile opens. No check-in is recorded."
            onClick={() => test.mutate()}
          >
            <PlayIcon data-icon="inline-start" />
            {test.isPending ? 'Testing...' : 'Test connection'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {config.isConfigured && !canTest ? 'Save your changes to test them.' : 'The test opens the turnstile.'}
          </span>
        </div>

        {testResult && (
          <div role={testResult.status === 'success' ? 'status' : 'alert'} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              {testResult.status === 'success' ? (
                <Badge variant="live">
                  <CheckIcon data-icon="inline-start" />
                  Success
                </Badge>
              ) : (
                <Badge variant="retry">
                  <TriangleAlertIcon data-icon="inline-start" />
                  Failed
                </Badge>
              )}
              {testResult.response && (
                <span className="numerals text-sm font-semibold">HTTP {testResult.response.httpStatus}</span>
              )}
              <span className="text-sm">
                {testResult.status === 'success'
                  ? 'The turnstile API accepted the request.'
                  : FAILURE_MESSAGES[testResult.error]}
              </span>
            </div>
            {testResult.response && (
              <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
                {typeof testResult.response.body === 'string'
                  ? testResult.response.body || '(empty response)'
                  : JSON.stringify(testResult.response.body, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

export const TurnstileSettings = Object.assign(TurnstileSettingsRoot, { Skeleton: TurnstileSettingsSkeleton });
