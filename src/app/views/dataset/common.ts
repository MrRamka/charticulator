// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Dataset } from "../../../core";
import { OrderMode } from "../../../core/specification/types";
import { strings } from "../../../strings";

export const kind2Icon: { [name in Dataset.DataKind]: string } = {
  categorical: "type/categorical",
  numerical: "type/numerical",
  ordinal: "type/ordinal",
  temporal: "type/temporal",
};

export const kind2CompatibleKinds: {
  [name in Dataset.DataKind]: Dataset.DataKind[];
} = {
  // Ordinal is compatible with categorical
  categorical: [Dataset.DataKind.Ordinal],
  // Temporal is compatible with numerical
  numerical: [Dataset.DataKind.Temporal],
  ordinal: [],
  temporal: [],
};

/** Determine if kind is acceptable, considering compatible kinds */
export function isKindAcceptable(
  kind: Dataset.DataKind,
  acceptKinds?: Dataset.DataKind[]
) {
  if (acceptKinds == null) {
    return true;
  } else {
    for (const item of acceptKinds) {
      if (item == kind) {
        return true;
      }
      if (kind2CompatibleKinds[item] != null) {
        const compatibles = kind2CompatibleKinds[item];
        if (compatibles.indexOf(kind) >= 0) {
          return true;
        }
      }
    }
    return false;
  }
}

export interface DerivedColumnDescription {
  name: string;
  displayName?: string;
  type: Dataset.DataType;
  function: string;
  metadata: Dataset.ColumnMetadata;
}

function makeTwoDigitRange(start: number, end: number): string[] {
  const r: string[] = [];
  for (let i = start; i <= end; i++) {
    let istr = i.toString();
    while (istr.length < 2) {
      istr = "0" + istr;
    }
    r.push(istr);
  }
  return r;
}

export const type2DerivedColumns: {
  [name in Dataset.DataType]: DerivedColumnDescription[];
} = {
  string: null,
  number: null,
  boolean: null,
  date: [
    {
      name: "year",
      displayName: "Year",
      type: Dataset.DataType.String,
      function: "date.year",
      metadata: {
        kind: Dataset.DataKind.Categorical,
        orderMode: OrderMode.alphabetically,
      },
    },
    {
      name: "month",
      displayName: "Month",
      type: Dataset.DataType.String,
      function: "date.month",
      metadata: {
        kind: Dataset.DataKind.Categorical,
        order: strings.dataset.months,
      },
    },
    {
      name: "monthnumber",
      displayName: "Month number",
      type: Dataset.DataType.String,
      function: "date.monthnumber",
      metadata: {
        kind: Dataset.DataKind.Categorical,
        orderMode: OrderMode.alphabetically,
      },
    },
    {
      name: "day",
      displayName: "Day",
      type: Dataset.DataType.String,
      function: "date.day",
      metadata: {
        kind: Dataset.DataKind.Categorical,
        orderMode: OrderMode.alphabetically,
      },
    },
    {
      name: "weekOfYear",
      displayName: "Week of year",
      type: Dataset.DataType.String,
      function: "date.weekOfYear",
      metadata: {
        kind: Dataset.DataKind.Categorical,
        orderMode: OrderMode.alphabetically,
      },
    },
    {
      name: "dayOfYear",
      displayName: "Day of year",
      type: Dataset.DataType.String,
      function: "date.dayOfYear",
      metadata: {
        kind: Dataset.DataKind.Categorical,
        orderMode: OrderMode.alphabetically,
      },
    },
    {
      name: "weekday",
      displayName: "Weekday",
      type: Dataset.DataType.String,
      function: "date.weekday",
      metadata: {
        kind: Dataset.DataKind.Categorical,
        order: strings.dataset.weekday,
      },
    },
    {
      name: "hour",
      displayName: "Hour",
      type: Dataset.DataType.String,
      function: "date.hour",
      metadata: {
        kind: Dataset.DataKind.Categorical,
        order: makeTwoDigitRange(0, 24),
      },
    },
    {
      name: "minute",
      displayName: "Minute",
      type: Dataset.DataType.String,
      function: "date.minute",
      metadata: {
        kind: Dataset.DataKind.Categorical,
        order: makeTwoDigitRange(0, 59),
      },
    },
    {
      name: "second",
      displayName: "Second",
      type: Dataset.DataType.String,
      function: "date.second",
      metadata: {
        kind: Dataset.DataKind.Categorical,
        order: makeTwoDigitRange(0, 59),
      },
    },
  ],
};
