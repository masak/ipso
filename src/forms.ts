import {
    ValueSpecialForm,
} from "./value";

const cond = new ValueSpecialForm("cond");
const label = new ValueSpecialForm("label");
const lambda = new ValueSpecialForm("lambda");
const quote = new ValueSpecialForm("quote");

export {
    cond,
    label,
    lambda,
    quote,
};

