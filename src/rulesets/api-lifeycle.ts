import { SnykApiCheckDsl } from "../dsl";
const { expect } = require("chai");

export const rules = {
  example: ({ checkApiContext, responses }: SnykApiCheckDsl) => {
    checkApiContext.must(
      "lifeycle rules have to be followed",
      (context, docs) => {
        docs.includeDocsLink("https://how.we.version/rule");
        context.changeVersion.date;
      },
    );
  },

  stabilityRequirement: ({ stability }: SnykApiCheckDsl) => {
    stability.must(
      "be provided for every resource document",
      (before, after, context, docs) => {
        const allowed = ["wip", "experimental", "beta", "ga", "deprecated"];
        const wasValid = allowed.includes(after || "");

        expect(wasValid, `${after} must be one of allowed values ${allowed}`).to
          .be.ok;
      },
    );
  },

  allowedStabilityTransitions: ({ stability }: SnykApiCheckDsl) => {
    stability.must(
      "not change unless it was wip",
      (before, after, context, docs) => {
        if (!before && !after) return;
        if (before === "wip") return;
        expect(before).to.equal(after);
      },
    );
  },
};
