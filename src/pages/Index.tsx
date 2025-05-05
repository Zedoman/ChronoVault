
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the main app
    navigate("/");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neo-dark">
      <p className="text-white font-mono">Redirecting...</p>
    </div>
  );
};

export default Index;
