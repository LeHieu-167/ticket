import Swal from "sweetalert2";

export const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  background: "#1a1a1a",
  color: "#fff",
  customClass: {
    popup: "rounded-lg shadow-lg",
  },
});

export const useToast = () => ({
  success: (message: string) => toast.fire({ icon: "success", title: message }),
  error: (message: string) => toast.fire({ icon: "error", title: message }),
  info: (message: string) => toast.fire({ icon: "info", title: message }),
  warning: (message: string) => toast.fire({ icon: "warning", title: message }),
});
