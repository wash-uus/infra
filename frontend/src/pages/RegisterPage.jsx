import { useState } from "react";
import { useNavigate } from "react-router-dom";

import SignupModal from "../components/signup/SignupModal";

/**
 * RegisterPage — Auto-opens the multi-step SignupModal.
 * Closing the modal returns the user to the home page.
 */
export default function RegisterPage() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const handleClose = () => {
    setOpen(false);
    navigate("/");
  };

  return (
    <div className="page-bg min-h-[calc(100vh-80px)]">
      <SignupModal open={open} onClose={handleClose} />
    </div>
  );
}
