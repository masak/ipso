export type Expr =
    | ExprSymbol
    | ExprList;

export class ExprSymbol {
    constructor(public name: string) {
    }

    toString(): string {
        return this.name;
    }
}

export class ExprList {
    constructor(public elements: Array<Expr>) {
    }

    toString(): string {
        return "(" + this.elements.map(e => e.toString()).join("") + ")";
    }
}

