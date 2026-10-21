import { useEffect, useState } from "react";
import { getAuthOptions } from "./api/accountApi";

// Whether the server can text codes, so screens show mobile-number fields (sign-in, account,
// players). Asked once per page load; until the answer arrives — or if it can't be had — numbers
// stay hidden, the way the app worked before they existed.

const OFF = { phone: false, defaultCountryCode: "+91" };
let asked = null;

export function useAuthOptions() {
  const [options, setOptions] = useState(OFF);
  useEffect(() => {
    let live = true;
    asked ??= getAuthOptions().catch(() => {
      asked = null; // try again next time a screen asks
      return OFF;
    });
    asked.then((value) => live && setOptions(value ?? OFF));
    return () => {
      live = false;
    };
  }, []);
  return options;
}

/** A stored mobile number for reading: "+919876543210" → "+91 98765 43210"; others as stored. */
export function formatPhone(e164) {
  if (!e164) return "";
  const india = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return india ? `+91 ${india[1]} ${india[2]}` : e164;
}
