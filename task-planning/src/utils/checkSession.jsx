import apiService from "./api";

const checkSession = async () => {
  try {
    const response = await apiService.get("/users/session-check/");
    console.log(response.data);
    return response.data.authenticated; // Return session status
  } catch (error) {
    return false; // Session is invalid or expired
  }
};

export default checkSession;