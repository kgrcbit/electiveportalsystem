import { useEffect, useState } from "react";

const initialForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  error = "",
}) {
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(1);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setForm(initialForm);
      setStep(1);
      setLocalError("");
    }
  }, [isOpen]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setLocalError("");
  };

  const handleContinue = (event) => {
    event.preventDefault();

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setLocalError("Please fill in all fields");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setLocalError("New password and confirm password do not match");
      return;
    }

    if (form.newPassword.length < 6) {
      setLocalError("New password must be at least 6 characters");
      return;
    }

    setStep(2);
  };

  const handleConfirm = async () => {
    setLocalError("");
    await onConfirm({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
  };

  const message = localError || error;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-primary/10">
        {step === 1 ? (
          <form className="space-y-4" onSubmit={handleContinue}>
            <div>
              <h2 className="text-2xl font-bold text-primary">
                Change Password
              </h2>
              <p className="mt-1 text-sm text-primary-light">
                Enter your current password and choose a new one.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-primary">
                Current Password
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-primary/20 p-3 text-primary placeholder-primary-light shadow-classic transition-shadow focus:outline-none focus:ring-2 focus:ring-accent hover:shadow-hover"
                value={form.currentPassword}
                onChange={handleChange("currentPassword")}
                placeholder="Enter your current password"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-primary">
                New Password
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-primary/20 p-3 text-primary placeholder-primary-light shadow-classic transition-shadow focus:outline-none focus:ring-2 focus:ring-accent hover:shadow-hover"
                value={form.newPassword}
                onChange={handleChange("newPassword")}
                placeholder="Choose a new password"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-primary">
                Confirm New Password
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-primary/20 p-3 text-primary placeholder-primary-light shadow-classic transition-shadow focus:outline-none focus:ring-2 focus:ring-accent hover:shadow-hover"
                value={form.confirmPassword}
                onChange={handleChange("confirmPassword")}
                placeholder="Re-enter the new password"
              />
            </div>

            {message ? (
              <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
                {message}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-xl border border-primary/20 px-4 py-2 text-primary font-semibold transition hover:bg-background hover:shadow-hover"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-accent px-4 py-2 font-semibold text-white shadow-classic transition hover:bg-accent-dark hover:shadow-hover"
              >
                Continue
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-primary">
                Confirm Password Change
              </h2>
              <p className="mt-2 text-sm text-primary-light">
                Are you sure you want to change your password? You will need to
                use the new password the next time you sign in.
              </p>
            </div>

            {message ? (
              <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
                {message}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-xl border border-primary/20 px-4 py-2 text-primary font-semibold transition hover:bg-background hover:shadow-hover"
                onClick={() => {
                  setStep(1);
                  setLocalError("");
                }}
                disabled={loading}
              >
                Go Back
              </button>
              <button
                type="button"
                className="rounded-xl bg-success px-4 py-2 font-semibold text-white shadow-classic transition hover:bg-success/80 hover:shadow-hover disabled:cursor-not-allowed disabled:bg-primary-dark"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "Updating..." : "Confirm change"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

