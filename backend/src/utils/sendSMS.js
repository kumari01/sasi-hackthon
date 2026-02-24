import dotenv from "dotenv";
dotenv.config();

import pkg from "twilio";
const twilio = pkg.default || pkg;

export const sendSMS = async (phone, otp) => {
  try {
    console.log("Using SID:", process.env.TWILIO_ACCOUNT_SID);

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const message = await client.messages.create({
      body: `Your OTP is ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phone}`
    });

    console.log("SMS SENT SUCCESS:", message.sid);
      console.log("SMS STATUS:", message.status);

    if (message.status === "failed" || message.status === "undelivered") {
      return false;
    }

    return true;

  } catch (error) {
  console.log("TWILIO ERROR CODE:", error.code);
  console.log("TWILIO ERROR MESSAGE:", error.message);
  console.log("TWILIO FULL ERROR:", error);
  return false;
}
};
