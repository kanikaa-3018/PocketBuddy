import assert from "node:assert/strict";
import { buildUpiPaymentIntent, isValidUpiId } from "./upi-payment";

assert.equal(isValidUpiId("nishant.demo@upi"), true);
assert.equal(isValidUpiId("not-a-upi-id"), false);

assert.equal(
  buildUpiPaymentIntent({
    upiId: "nishant.demo@upi",
    payeeName: "Nishant Harkut",
    amountRupees: 83,
    note: "Travel split: Station to Campus",
  }),
  "upi://pay?pa=nishant.demo%40upi&pn=Nishant%20Harkut&am=83.00&cu=INR&tn=Travel%20split%3A%20Station%20to%20Campus",
);

assert.equal(
  buildUpiPaymentIntent({
    upiId: "nishant.demo@upi",
    payeeName: "Nishant Harkut",
    amountRupees: 83.126,
    note: "Travel split",
  }),
  "upi://pay?pa=nishant.demo%40upi&pn=Nishant%20Harkut&am=83.13&cu=INR&tn=Travel%20split",
);

assert.equal(
  buildUpiPaymentIntent({
    upiId: "",
    payeeName: "Nishant Harkut",
    amountRupees: 83,
    note: "Travel split",
  }),
  null,
);

assert.equal(
  buildUpiPaymentIntent({
    upiId: "nishant.demo@upi",
    payeeName: "Nishant Harkut",
    amountRupees: 0,
    note: "Travel split",
  }),
  null,
);
