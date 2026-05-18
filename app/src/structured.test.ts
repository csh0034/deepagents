import { describe, expect, it } from "vitest";
import { createDeepAgent } from "deepagents";
import { providerStrategy } from "langchain";
import { z } from "zod";

describe("structured response", () => {
  it("responseFormat 스키마에 맞는 JSON 을 structuredResponse 로 돌려준다", async () => {
    const RecipeSchema = z.object({
      name: z.string().describe("요리 이름"),
      ingredients: z.array(z.string()).describe("재료 목록"),
      steps: z.array(z.string()).describe("조리 단계 (각각 한 문장)"),
      timeMinutes: z.number().describe("총 조리 시간 (분)"),
    });

    const agent = createDeepAgent({
      model: "openai:gpt-4o-mini",
      tools: [],
      systemPrompt: "사용자가 요청한 요리의 레시피를 정확한 구조로 답해.",
      responseFormat: providerStrategy(RecipeSchema),
    });

    const result = await agent.invoke({
      messages: [
        { role: "user", content: "간단한 라면 레시피 알려줘. 5분 안에 끝나는 걸로." },
      ],
    });

    const structured = (result as { structuredResponse?: unknown })
      .structuredResponse as z.infer<typeof RecipeSchema> | undefined;

    console.log("\n[structuredResponse]");
    console.log(JSON.stringify(structured, null, 2));

    expect(structured).toBeDefined();
    expect(structured?.name).toBeTypeOf("string");
    expect(Array.isArray(structured?.ingredients)).toBe(true);
    expect(structured?.ingredients.length).toBeGreaterThan(0);
    expect(Array.isArray(structured?.steps)).toBe(true);
    expect(structured?.steps.length).toBeGreaterThan(0);
    expect(structured?.timeMinutes).toBeTypeOf("number");

    // zod 로 다시 한 번 런타임 검증
    const parsed = RecipeSchema.safeParse(structured);
    expect(parsed.success).toBe(true);
  });
});
