import { Context } from "hono";
import { setSignedCookie, getSignedCookie, deleteCookie } from "hono/cookie";
import { Customer, User } from "@/models";
import {
  badRequestHandler,
  authenticationError,
  authorizationError,
  serverErrorHandler,
} from "@/middlewares";
import { auth } from "@/services";

// Register User
const registerUser = async (c: Context) => {
  const body = await c.req.json();

  const response = await auth.registerUserService(body);

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 201);
};

// Register Customer
const registerCustomer = async (c: Context) => {
  const body = await c.req.json();

  const response = await auth.registerCustomerService(body);

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 201);
};

// Login User
const loginUser = async (c: Context) => {
  const body = await c.req.json();
  const type = c.req.query("userType");
  const userType = type === "customer" ? "customer" : "user";

  const response = await auth.loginService(body, { userType });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  // Refresh token setting on the cookie
  await setSignedCookie(
    c,
    "refreshToken",
    response.success.tokens.refreshToken,
    process.env.JWT_REFRESH_SECRET!,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      domain:
        process.env.NODE_ENV === "production"
          ? process.env.DOMAIN_NAME
          : undefined,
      maxAge: 604800,
    }
  );

  return c.json(response.success, 200);
};

// Refresh Token
const refreshToken = async (c: Context) => {
  const token = await getSignedCookie(
    c,
    process.env.JWT_REFRESH_SECRET!,
    "refreshToken"
  );

  console.log("Token: ", token);

  if (!token) return authenticationError(c);

  const response = await auth.refreshTokenService(token);

  if (response.authorizationError) {
    return authorizationError(c, response.authorizationError.message);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// Logout User
const logout = async (c: Context) => {
  const rToken = await getSignedCookie(
    c,
    process.env.JWT_REFRESH_SECRET!,
    "refreshToken"
  );

  if (!rToken) return authenticationError(c);

  try {
    const tokenPayload = (await c.get("user")) || c.get("customer");

    if (!tokenPayload) {
      return authenticationError(c);
    }

    const { id, role } = tokenPayload;

    const response = await auth.logoutService({ id, role, rToken });

    if (response.authenticationError) return authenticationError(c);

    if (response.serverError)
      return serverErrorHandler(c, response.serverError);

    // ✅ Delete cookie
    deleteCookie(c, "refreshToken", {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      domain:
        process.env.NODE_ENV === "production"
          ? process.env.DOMAIN_NAME
          : undefined,
    });

    return c.json(response.success, 200);
  } catch (error) {
    return c.json(
      {
        success: false,
        message: "Something went wrong during logout.",
      },
      500
    );
  }
};

// Change Password
const changePassword = async (c: Context) => {
  const body = await c.req.json();

  // Check if user exists. and get email from token
  const authenticated = (await c.get("user")) || c.get("customer");

  if (!authenticated) {
    return authenticationError(c);
  }

  let account: any;

  if (authenticated.role === "customer") {
    account = await Customer.findOne({
      $or: [{ email: authenticated.email }, { phone: authenticated.phone }],
    });
  } else {
    // for admin, manager, super_admin
    account = await User.findOne({
      $or: [{ email: authenticated.email }, { phone: authenticated.phone }],
    });
  }

  if (!account) {
    return authenticationError(c);
  }

  const response = await auth.changePasswordService({ account, body });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// Forgot Password
const forgotPassword = async (c: Context) => {
  const { email } = await c.req.json();

  const response = await auth.forgotPasswordService(email);

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// Reset Password
const resetPassword = async (c: Context) => {
  // Token come from param
  const resetToken = c.req.param("resetToken");

  // Password come from body
  const { password } = await c.req.json();

  const response = await auth.resetPasswordService({ password, resetToken });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// Get Me
const getMe = async (c: Context) => {
  const account = (await c.get("user")) || c.get("customer");

  console.log("Account: ", account);
  // Check if user is authenticated
  if (!account) {
    return authenticationError(c);
  }
  const response = await auth.getMeService(account);

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

// Change Avatar
const changeAvatar = async (c: Context) => {
  const body = await c.req.parseBody();
  const file = body["avatar"] as File;

  // Get user from auth token
  const authenticated = (await c.get("user")) || c.get("customer");

  if (!authenticated) {
    return authenticationError(c);
  }

  // Generate filename
  const fileN = c.req.query("filename") || "avatar";
  const filename = `${fileN}-${Date.now()}`;

  const response = await auth.changeAvatarService({
    body: { avatar: file },
    filename,
    user: authenticated,
    extension: "jpeg",
  });

  if (response.error) {
    return badRequestHandler(c, response.error);
  }

  if (response.serverError) {
    return serverErrorHandler(c, response.serverError);
  }

  return c.json(response.success, 200);
};

export {
  registerUser,
  registerCustomer,
  loginUser,
  refreshToken,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe,
  changeAvatar,
};
