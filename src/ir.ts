export type Ir =
    | IrLookup
    | IrError
    | IrSymbol
    | IrEmptyList
    | IrCons
    | IrFwdLabel
    | IrJumpUnlessNil
    | IrJump
    | IrSetSlot
    | IrCall
    | IrTailCall
    | IrClosure
    | IrRec;

export class IrLookup {
    constructor(public outerScopes: number, public slotIndex: number) {
    }
}

export class IrError {
    constructor(public stringIndex: number) {
    }
}

export class IrSymbol {
    constructor(public symbolIndex: number) {
    }
}

export class IrEmptyList {
}

export class IrCons {
    constructor(public carIr: Ir, public cdrSlot: number) {
    }
}

export class IrFwdLabel {
    constructor(public labelIndex: number, public body: Ir) {
    }
}

export class IrJumpUnlessNil {
    constructor(public scrutinee: Ir, public labelIndex: number) {
    }
}

export class IrJump {
    constructor(public labelIndex: number) {
    }
}

export class IrSetSlot {
    constructor(public slotIndex: number, public rhs: Ir) {
    }
}

export class IrCall {
    constructor(
        public closureSlotIndex: number,
        public argSlotIndices: Array<number>,
    ) {
    }
}

export class IrTailCall {
    constructor(
        public closureSlotIndex: number,
        public argSlotIndices: Array<number>,
    ) {
    }
}

export class IrClosure {
    constructor(public funcSlotIndex: number) {
    }
}

export class IrRec {
    constructor(public body: Ir) {
    }
}

