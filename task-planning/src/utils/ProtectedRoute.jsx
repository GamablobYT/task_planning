import react from "react"
import { Outlet, Navigate } from "react-router-dom"
import useStore from "../store/store";

const ProtectedRoute = () => {
    // console.log("isAuthenticated: ", useStore.getState().isAuthenticated);
    // console.log("roleAllowed: ", roleAllowed);
    // console.log("role = ", useStore.getState().role);
    return (useStore.getState().isAuthenticated) ? <Outlet /> : <Navigate to="/signup" />;
};

export default ProtectedRoute;