import express, { Request, Response } from "express";

// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
  name: string;
  type: string;
}

interface requiredItem {
  name: string;
  quantity: number;
}

interface recipe extends cookbookEntry {
  requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
  cookTime: number;
}

// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook: recipe[] | ingredient[] = [];

// Task 1 helper (don't touch)
app.post("/parse", (req: Request, res: Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input);
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  }
  res.json({ msg: parsed_string });
  return;
});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that
const parse_handwriting = (recipeName: string): string | null => {
  console.log(recipeName)
  let modifiedRecipeName = recipeName.replace(/-/g, " ");
  modifiedRecipeName = modifiedRecipeName.replace(/_/g, " ");
  console.log(modifiedRecipeName)
  modifiedRecipeName = modifiedRecipeName.replace(/[^a-zA-Z\s]/g, "");
  modifiedRecipeName = modifiedRecipeName.toLowerCase();
  modifiedRecipeName = modifiedRecipeName.replace(/\s+/g, " ");

  const recipeNameArr = modifiedRecipeName.split("");

  for (let i = 0; i < recipeNameArr.length; i++) {
    if (i === 0) {
      recipeNameArr[0] = recipeNameArr[0].toUpperCase();
    } else if (recipeNameArr[i] === " " && /[a-z]/.test(recipeNameArr[i + 1])) {
      recipeNameArr[i + 1] = recipeNameArr[i + 1].toUpperCase();
    }
  }

  modifiedRecipeName = recipeNameArr.join("");
  if (modifiedRecipeName.length === 0) {
    return null;
  }

  return modifiedRecipeName;
};

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook

app.post("/entry", (req: Request, res: Response) => {
  const entry = req.body;

  if (entry.type !== "recipe" && entry.type !== "ingredient") {
    res.status(400).send("invalid type");
  }

  if (entry.type === "ingredient" && entry.cookTime < 0) {
    res.status(400).send("invalid cook time");
  }

  if (cookbook.some((e) => e.name === entry.name)) {
    res.status(400).send("non-unique entry name");
  }

  if (entry.type === "recipe") {
    const itemNames = entry.requiredItems.map((item: any) => item.name);
    const uniqueNames = new Set(itemNames);
    if (itemNames.length !== uniqueNames.size) {
      return res.status(400).send("duplicated requiredItems names");
    }
  }
  cookbook.push(entry);

  res.status(200).send("entry added successfully");
});

// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name
app.get("/summary", (req: Request, res: Request) => {
  
  const name = req.query.name;

  const mainRecipe = cookbook.find((e) => e.type === "recipe" && e.name === name);

  if (!mainRecipe) {
    return res.status(400).send("recipe not found or is an ingredient");
  }

  const getIngredientsAndCookTime = (name: string, multiplier: number) => {
    const recipe = cookbook.find((e) => e.name === name);
    if (!recipe) {
      throw new Error("unknown item in cookbook");
    }

    if (recipe.type === "ingredient") {
      return {
        cookTime: (recipe as ingredient).cookTime * multiplier,
        ingredients: [{ name: recipe.name, quantity: multiplier }]
      };
    }

    let totalCookTime = 0;
    const aggregatedIngredients: Record<string, { name: string; quantity: number }> = {};


    if (recipe.type == "recipe") {
      for (const item of (recipe as recipe).requiredItems) {
        const result = getIngredientsAndCookTime(item.name, item.quantity * multiplier);
        totalCookTime += result.cookTime;

        for (const ingredient of result.ingredients) {
          if (aggregatedIngredients[ingredient.name]) {
            aggregatedIngredients[ingredient.name].quantity += ingredient.quantity;
          } else {
            aggregatedIngredients[ingredient.name] = ingredient;
          }
        }
      }
    }

    return {
      cookTime: totalCookTime,
      ingredients: Object.values(aggregatedIngredients)
    };
  }

  try {
    const result = getIngredientsAndCookTime(mainRecipe.name, 1);

    res.status(200).json({
      name: mainRecipe.name,
      cookTime: result.cookTime,
      ingredients: result.ingredients
    });
  } catch (err) {
    res.status(400).send(err.message);
  }
});

// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});
