import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast.hooks";
import {
  useResendVerificationMutation,
  useVerifyEmailMutation,
} from "@/queries/mutations/auth";
import { AuthForm } from "./auth-form";
import { AuthLayout } from "./auth-layout";
import { ErrorBox } from "./error-box";
import { errorMapper } from "./helpers";

function VerifyEmail() {
  const { t } = useTranslation();
  const toast = useToast();
  const [, navigate] = useLocation();
  const [params] = useSearchParams();

  const [token, setToken] = useState<string>(params.get("token") ?? "");

  const verifyEmailMutation = useVerifyEmailMutation();

  const onSubmit = async (evt: React.SubmitEvent) => {
    evt.preventDefault();
    await verifyEmailMutation.mutateAsync({ token });

    toast.show({
      children: t("auth.verify_email.success"),
      variant: "success",
      duration: 5000,
    });

    navigate("/auth/login");
  };

  return (
    <AuthLayout
      title={t("auth.verify_email.title")}
      footer={<ResendVerificationDialog />}
    >
      <AuthForm onSubmit={onSubmit}>
        {verifyEmailMutation.error && (
          <ErrorBox>
            {errorMapper(
              verifyEmailMutation.error,
              t,
              "auth.errors.verify_email_failed",
            )}
          </ErrorBox>
        )}
        <Field full>
          <FieldLabel htmlFor="token">
            {t("auth.verify_email.token")}
          </FieldLabel>
          <input
            disabled={verifyEmailMutation.isPending}
            id="token"
            onChange={(e) => setToken(e.target.value)}
            required
            type="text"
            value={token}
          />
        </Field>
        <Button
          disabled={verifyEmailMutation.isPending || !token}
          type="submit"
          variant="primary"
          full
        >
          {t("auth.verify_email.action")}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}

function ResendVerificationDialog() {
  const { t } = useTranslation();
  const toast = useToast();

  const resendVerificationMutation = useResendVerificationMutation();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const onSubmit = async (evt: React.SubmitEvent) => {
    evt.preventDefault();

    await resendVerificationMutation.mutateAsync({ email });

    toast.show({
      children: t("auth.verify_email.resend_success"),
      variant: "success",
      duration: 5000,
    });

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="bare">
          {t("auth.verify_email.resend")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Modal>
          <ModalInner size="40rem">
            <ModalActions />
            <DefaultModalContent title={t("auth.verify_email.resend")}>
              <AuthForm onSubmit={onSubmit}>
                {resendVerificationMutation.error && (
                  <ErrorBox>
                    {errorMapper(
                      resendVerificationMutation.error,
                      t,
                      "auth.errors.verify_email_send_failed",
                    )}
                  </ErrorBox>
                )}
                <Field full>
                  <FieldLabel htmlFor="resend-email">
                    {t("auth.email")}
                  </FieldLabel>
                  <input
                    autoComplete="email"
                    disabled={resendVerificationMutation.isPending}
                    id="resend-email"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                </Field>
                <Button
                  disabled={resendVerificationMutation.isPending}
                  type="submit"
                  variant="primary"
                  full
                >
                  {t("auth.verify_email.resend_action")}
                </Button>
              </AuthForm>
            </DefaultModalContent>
          </ModalInner>
        </Modal>
        <ModalBackdrop />
      </DialogContent>
    </Dialog>
  );
}

export default VerifyEmail;
