let recipes = []; // Global variable to store recipes

window.onload = function() {
    fetch('cocktails.json')
        .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            window.recipes = data;
            if (!window.recipes || window.recipes.length === 0) {
                console.error('No recipes available to display');
                return;
            }

            // Logging to debug the data structure
            console.log('Fetched recipes:', window.recipes);

            const fuseOptions = {
                includeScore: true,
                keys: ['Name'],
                threshold: 0.4
            };
            window.fuse = new Fuse(window.recipes, fuseOptions);

            // Initialize dropdowns and event listeners
            populateDropdowns(); 
            displayRecipes(window.recipes);
            initializeFilters(false);
            attachEventListeners(); // Ensure this function is defined
        })
        .catch(error => {
            console.error('Failed to load recipes:', error);
        });
};

let includeSelect;
let excludeSelect;
let glassTypeSelect;
let servingSizeSelect;

let onlySelect;

document.addEventListener('DOMContentLoaded', function() {
    const ingredientIncludeElement = document.getElementById('ingredient-include');
    if (ingredientIncludeElement && !ingredientIncludeElement.getAttribute('data-choices-initialized')) {
        includeSelect = new Choices(ingredientIncludeElement, {
            allowHTML: true,
            removeItemButton: true,
        });
        ingredientIncludeElement.setAttribute('data-choices-initialized', 'true');
        ingredientIncludeElement.choicesInstance = includeSelect;
        console.log('Initialized Choices for ingredient-include');
    } else {
        console.log('Choices already initialized for ingredient-include');
    }

    const ingredientExcludeElement = document.getElementById('ingredient-exclude');
    if (ingredientExcludeElement && !ingredientExcludeElement.getAttribute('data-choices-initialized')) {
        excludeSelect = new Choices(ingredientExcludeElement, {
            allowHTML: true,
            removeItemButton: true,
        });
        ingredientExcludeElement.setAttribute('data-choices-initialized', 'true');
        ingredientExcludeElement.choicesInstance = excludeSelect;
        console.log('Initialized Choices for ingredient-exclude');
    } else {
        console.log('Choices already initialized for ingredient-exclude');
    }

    const glassTypeElement = document.getElementById('glass-type');
    if (glassTypeElement && !glassTypeElement.getAttribute('data-choices-initialized')) {
        glassTypeSelect = new Choices(glassTypeElement, {
            allowHTML: true,
            removeItemButton: true,
        });
        glassTypeElement.setAttribute('data-choices-initialized', 'true');
        glassTypeElement.choicesInstance = glassTypeSelect;
        console.log('Initialized Choices for glass-type');
    } else {
        console.log('Choices already initialized for glass-type');
    }

    const servingSizeElement = document.getElementById('serving-size');
    if (servingSizeElement && !servingSizeElement.getAttribute('data-choices-initialized')) {
        servingSizeSelect = new Choices(servingSizeElement, {
            allowHTML: true,
            removeItemButton: true,
        });
        servingSizeElement.setAttribute('data-choices-initialized', 'true');
        servingSizeElement.choicesInstance = servingSizeSelect;
        console.log('Initialized Choices for serving-size');
    } else {
        console.log('Choices already initialized for serving-size');
    }

    const ingredientOnlyElement = document.getElementById('ingredient-only');
    if (ingredientOnlyElement && !ingredientOnlyElement.getAttribute('data-choices-initialized')) {
        onlySelect = new Choices(ingredientOnlyElement, {
            allowHTML: true,
            removeItemButton: true,
        });
        ingredientOnlyElement.setAttribute('data-choices-initialized', 'true');
        ingredientOnlyElement.choicesInstance = onlySelect;
        console.log('Initialized Choices for ingredient-only');
    } else {
        console.log('Choices already initialized for ingredient-only');
    }

    // Attach event listeners
    attachEventListeners();
});

// Ensure this function is defined to handle dropdown changes
function attachEventListeners() {
    ['ingredient-include', 'ingredient-exclude', 'glass-type', 'serving-size', 'ingredient-only'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', function() {
                console.log(`${id} changed`); // Debugging log
                filterRecipes(); // Ensure this function is defined and works
            });
        }
    });

    document.getElementById('clear-filters').addEventListener('click', function() {
        initializeFilters(true);
    });
}

function initializeFilters(shouldFilter = true) {
    const selectIds = ['ingredient-include', 'ingredient-exclude', 'glass-type', 'serving-size', 'ingredient-only'];

    selectIds.forEach(id => {
        const element = document.getElementById(id);
        if (element && !element.getAttribute('data-choices-initialized')) {
            if (id === 'serving-size') {
                servingSizeSelect = new Choices(element, {
                    allowHTML: true,
                    searchEnabled: false,
                    shouldSort: false,
                    itemSelectText: ''
                });
                element.choicesInstance = servingSizeSelect;
                console.log(`Initialized Choices for ${id}`);
            } else {
                const selectInstance = new Choices(element, {
                    allowHTML: true,
                    removeItemButton: true,
                    placeholder: true,
                    placeholderValue: `Select ${id.replace('-', ' ')}`,
                    itemSelectText: ''
                });
                element.choicesInstance = selectInstance;
                console.log(`Initialized Choices for ${id}`);
            }
            element.setAttribute('data-choices-initialized', 'true');
        } else {
            console.log(`Choices already initialized for ${id}`);
        }
    });

    document.querySelector('input[name="inclusion-type"][value="AND"]').checked = true;
    document.querySelector('input[name="exclusion-type"][value="OR"]').checked = true;

    selectIds.forEach(id => {
        const element = document.getElementById(id);
        if (element && element.choicesInstance) {
            if (id === 'serving-size') {
                element.choicesInstance.setChoiceByValue('Any');
            } else {
                element.choicesInstance.removeActiveItems();
            }
        }
    });

    if (shouldFilter) {
        filterRecipes();
    }
}

function populateDropdowns() {
    const allIngredients = window.recipes.flatMap(recipe => recipe.Ingredients.map(ing => ing.ingredient_search));
    const uniqueIngredients = [...new Set(allIngredients)].sort();

    // Populate include and exclude dropdowns with all ingredients
    populateDropdown('ingredient-include', uniqueIngredients);
    populateDropdown('ingredient-exclude', uniqueIngredients);

    if (includeSelect) {
        includeSelect.setChoices(uniqueIngredients.map(ingredient => ({ value: ingredient, label: ingredient })), 'value', 'label', true);
        includeSelect.config.allowHTML = true;
    }

    if (excludeSelect) {
        excludeSelect.setChoices(uniqueIngredients.map(ingredient => ({ value: ingredient, label: ingredient })), 'value', 'label', true);
        excludeSelect.config.allowHTML = true;
    }

    // Apply filtering only for `onlySelect`
    const ignoredIngredients = ["Peel - Lemon", "Peel - Other", "Peel - Orange"]; // Ingredients to ignore
    const filteredIngredients = uniqueIngredients.filter(ingredient => !ignoredIngredients.includes(ingredient));
    populateDropdown('ingredient-only', filteredIngredients);

    if (onlySelect) {
        onlySelect.setChoices(filteredIngredients.map(ingredient => ({ value: ingredient, label: ingredient })), 'value', 'label', true);
        onlySelect.config.allowHTML = true;
    }
}

function populateDropdown(elementId, options) {
    const selectElement = document.getElementById(elementId);
    if (selectElement) {
        // Clear existing options
        selectElement.innerHTML = '';
        // Add new options
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.text = option;
            selectElement.add(optionElement);
        });
    }
}

function attachEventListeners() {
    // Attach change event listeners to dropdowns
    ['ingredient-include', 'ingredient-exclude', 'glass-type', 'serving-size', 'ingredient-only'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', function() {
                filterRecipes(); // Ensure this function is defined and works as expected
            });
        } else {
            console.warn(`Element with id ${id} not found.`);
        }
    });

    // Attach change event listeners to radio buttons
    document.querySelectorAll('input[name="inclusion-type"], input[name="exclusion-type"]')
        .forEach(radio => {
            radio.addEventListener('change', filterRecipes);
        });

    // Attach scroll event listener to the recipes container
    const recipesContainer = document.getElementById('recipes-container');
    if (recipesContainer) {
        recipesContainer.addEventListener('scroll', updateScrollFade); // Ensure this function is defined
        updateScrollFade(); // Initial call to set the fade state
    } else {
        console.warn('Recipes container not found.');
    }
}

function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.classList.add('recipe-card');

    const cardHeader = document.createElement('div');
    cardHeader.classList.add('card-header');

    const title = document.createElement('h3');
    title.classList.add('card-title');
    title.textContent = recipe.Serving !== "Standard" ? `${recipe.Name} (Serves ${recipe.Serving.replace("Serves ", "")})` : recipe.Name;

    const page = document.createElement('span');
    page.classList.add('page-number');
    page.textContent = 'Page ' + recipe.Page;
    cardHeader.appendChild(title);
    cardHeader.appendChild(page);

    const contentArea = document.createElement('div');
    contentArea.classList.add('card-content-area');
    contentArea.style.display = 'flex';

    const colorStripContainer = document.createElement('div');
    colorStripContainer.classList.add('color-strip-container');

    const colorStrip = document.createElement('div');
    colorStrip.classList.add('color-strip');

    // Conditional setting of background color based on recipe.Color
    if (recipe.Color) {
        colorStrip.style.backgroundColor = recipe.Color;
    } else {
        colorStrip.style.backgroundColor = "black"; // Replace 'defaultColor' with your preferred default color
    }

    colorStripContainer.appendChild(colorStrip);
    contentArea.appendChild(colorStripContainer); // Add the container to the content area

    const contentContainer = document.createElement('div');
    contentContainer.classList.add('card-content');

    const ingredientsTable = document.createElement('table');
    recipe.Ingredients.forEach(ingredient => {
        const row = ingredientsTable.insertRow();
        const cell1 = row.insertCell(0);
        const cell2 = row.insertCell(1);
        cell1.textContent = ingredient.Ingredient;
        cell2.textContent = ingredient.Measure;
    });

    const instructions = document.createElement('p');
    instructions.innerHTML = `<em>Instructions:</em> ${recipe.Instruction}`;
    contentContainer.appendChild(ingredientsTable);
    contentContainer.appendChild(instructions);

    // Add the comment section if it exists
    if (recipe.comment) {
        const comment = document.createElement('p');
        comment.classList.add('recipe-comment');
        comment.innerHTML = `<em>${recipe.comment}</em>`;
        contentContainer.appendChild(comment);
    }

    const glassTypeToImageMap = {
        "Wine glass": "img/Large wine glass.svg",
        "Claret glass": "img/Wine Glass.svg",
        "Large port wine glass": "img/Port wine glass.svg",
        "Large wine glass": "img/Large wine glass.svg",
        "Medium size wine glass": "img/Wine Glass.svg",
        "Port wine glass": "img/Port wine glass.svg",
        "Sherry glass": "img/Sherry glass.svg",
        "Small wine glass": "img/Wine Glass.svg",
        "Stem glass or China mug": "img/Wine Glass.svg",

        "Cocktail glass": ["img/Cocktail Glass.svg", "img/nick nora glass.svg", "img/Rounded cocktail glass.svg", "img/Rounded cocktail glass.svg"],
        "Glass missing": ["img/Cocktail Glass.svg", "img/nick nora glass.svg", "img/Rounded cocktail glass.svg", "img/Rounded cocktail glass.svg"],
        "No glass specified": ["img/Cocktail Glass.svg", "img/Rounded cocktail glass.svg"],

    
        "Large glass": "img/Tumbler.svg",
        "Medium size glass": "img/Tumbler.svg",
        "Small tumbler": "img/Tumbler.svg",
        "Tumbler": "img/Tumbler.svg",
        "Tumbler and hooker/shot glass": "img/Tumbler.svg",
        "Old-fashioned whisky glass": "img/Tumbler.svg",
    
        "Highball Glass": "img/Long Tumbler.svg",
        "Large tumbler": "img/Tumbler.svg",
        "Long tumbler": "img/Long Tumbler.svg",
        "Tall glass": "img/Long Tumbler.svg",
    
        "Liqueur glass": "img/Liqueur Glass.svg"
    };

    const glassInfo = document.createElement('div');
    glassInfo.classList.add('glass-info');

    const glassImage = document.createElement('img');
    glassImage.classList.add('glass-image');
    // Check if a glass type is specified and is in the map, otherwise use default Cocktail Glass
    if (recipe["Glass type"] && glassTypeToImageMap.hasOwnProperty(recipe["Glass type"])) {
        const glassOptions = glassTypeToImageMap[recipe["Glass type"]];
        if (Array.isArray(glassOptions)) {
            // Randomly select one of the two options with 50% probability
            glassImage.src = glassOptions[Math.floor(Math.random() * glassOptions.length)];
        } else {
            glassImage.src = glassOptions;
        }
    } else {
        // Default case: randomly choose between the two cocktail glass images
        const defaultOptions = ["img/Cocktail Glass.svg", "img/Rounded cocktail glass.svg"];
        glassImage.src = defaultOptions[Math.floor(Math.random() * defaultOptions.length)];
    }
    glassImage.alt = recipe["Glass type"] || "Glass not specified"; // Adjusted text for missing glass type

    const glassTypeName = document.createElement('div');
    glassTypeName.textContent = recipe["Glass type"] && recipe["Glass type"] !== "Glass missing" ? recipe["Glass type"] : "Glass not specified";
    glassInfo.appendChild(glassImage);
    glassInfo.appendChild(glassTypeName);

    contentArea.appendChild(contentContainer);
    contentArea.appendChild(glassInfo);

    card.appendChild(cardHeader);
    card.appendChild(contentArea);
    return card;
}

function displayRecipes(recipes, fromSearch = false) {
    const container = document.getElementById('recipes-container');
    if (!container) {
        console.error('Recipes container not found.');
        return;
    }

    const existingCards = Array.from(container.children);

    // Clear recipe cards but keep the spacer if it exists
    existingCards.forEach(card => {
        if (card.classList.contains('recipe-card')) {
            card.classList.remove('visible');
        }
    });

    // Delay to allow CSS transition before clearing the container
    setTimeout(() => {
        // Remove only recipe cards and headers, preserving any spacer
        Array.from(container.children).forEach(child => {
            if (!child.classList.contains('spacer')) {
                container.removeChild(child);
            }
        });

        let lastInitial = '';

        recipes.forEach(recipe => {
            const cleanName = recipe.Name.replace(/^The\s+/, '').replace(/^\W+/, '');
            const initial = cleanName[0].toUpperCase();  // Get the first significant character of the name

            // Add alphabetical headers if not from a search
            if (initial !== lastInitial && !fromSearch) {
                const header = document.createElement('div');
                header.textContent = initial;
                header.className = 'recipe-alpha-header';  // Assign a class for styling
                container.appendChild(header);
                lastInitial = initial;  // Update the lastInitial to the current initial
            }

            const card = createRecipeCard(recipe);  // Ensure this function is defined and creates a card correctly
            container.appendChild(card);

            // Ensure the card visibility transition is triggered
            requestAnimationFrame(() => {
                card.classList.add('visible');
            });
        });

        // Append a spacer at the end for better scroll handling
                // Append a spacer at the end for better scroll handling
                let spacer = container.querySelector('.spacer');
                if (!spacer) {
                    spacer = document.createElement('div');
                    spacer.className = 'spacer';
                }
                spacer.style.height = '240px'; // Ensure height is set dynamically
                spacer.style.backgroundColor = 'transparent'; // Set visible background temporarily for debugging
                spacer.style.margin = '0'; // Avoid margin collapsing issues
                container.appendChild(spacer);
        
    }, 750);
}


function filterRecipes() {
    const includeSelect = document.getElementById('ingredient-include');
    const excludeSelect = document.getElementById('ingredient-exclude');
    const glassTypeSelect = document.getElementById('glass-type');
    const servingSizeSelect = document.getElementById('serving-size');

    const onlySelect = document.getElementById('ingredient-only');

    // Check if Choices is initialized
    if (!includeSelect.choicesInstance || !excludeSelect.choicesInstance || !glassTypeSelect.choicesInstance || !servingSizeSelect.choicesInstance || !onlySelect.choicesInstance) {
        console.error('Choices not initialized on one or more select elements.');
        console.log({
            includeSelectChoices: includeSelect.choicesInstance,
            excludeSelectChoices: excludeSelect.choicesInstance,
            glassTypeSelectChoices: glassTypeSelect.choicesInstance,
            servingSizeSelectChoices: servingSizeSelect.choicesInstance,
            onlySelectChoices: onlySelect.choicesInstance
        });
        return;
    }

    const includes = includeSelect.choicesInstance.getValue(true);
    const excludes = excludeSelect.choicesInstance.getValue(true);
    const inclusionType = document.querySelector('input[name="inclusion-type"]:checked').value;
    const exclusionType = document.querySelector('input[name="exclusion-type"]:checked').value;
    const servingSize = servingSizeSelect.value;
    const glassTypes = glassTypeSelect.choicesInstance.getValue(true);

    const only = onlySelect.choicesInstance.getValue(true);

    console.log('Filter criteria:', { includes, excludes, inclusionType, exclusionType, servingSize, glassTypes, only });

    const glassTypeMappings = {
        "Wine glasses": ["Wine glass", "Large port wine glass", "Small wine glass", "Port wine glass", "Sherry glass", "Claret glass"],
        "Tumblers": ["Long tumbler", "Tumbler", "Small tumbler", "Tumbler and hooker/shot glass", "Large tumbler", "Old-fashioned whisky glass"],
        "Highball/tall glasses": ["Long tumbler", "Highball Glass", "Tall glass"],
        "No glass specified": ["Glass missing", "No glass specified"]
    };

    const effectiveGlassTypes = glassTypes.flatMap(type => glassTypeMappings[type] || [type]);    

    const filteredRecipes = window.recipes.filter(recipe => {

        // Access recipe ingredients using `ingredient_search`
        const recipeIngredients = recipe.Ingredients.map(ing => ing.ingredient_search);
    
        // Include filter
        let includeMatch = includes.length === 0 || (inclusionType === 'AND' ?
            includes.every(include => recipeIngredients.includes(include)) :
            includes.some(include => recipeIngredients.includes(include)));
    
        // Exclude filter
        /*
        let excludeMatch = excludes.length === 0 || (exclusionType === 'AND' ?
            !excludes.every(exclude => recipeIngredients.includes(exclude)) :
            !excludes.some(exclude => recipeIngredients.includes(exclude)));
            */
            let excludeMatch;
            if (excludes.length === 0) {
                // If there are no excluded ingredients, we're good
                excludeMatch = true;
            } else {
                // Group the recipe's ingredients by option_type
                const optionGroups = recipe.Ingredients.reduce((acc, ing) => {
                    if (ing.option_type !== 'none') {
                        if (!acc[ing.option_type]) {
                            acc[ing.option_type] = [];
                        }
                        acc[ing.option_type].push(ing.ingredient_search);
                    }
                    return acc;
                }, {});
                
                // Helper to check if the recipe can avoid a single excluded ingredient
                function canAvoidExcludedIngredient(excludeIng) {
                    // If the recipe does not contain this excluded ingredient at all, we can avoid it trivially
                    if (!recipeIngredients.includes(excludeIng)) {
                        return true;
                    }
                    
                    // Otherwise, for each ingredient that matches `excludeIng`...
                    const matchedIngs = recipe.Ingredients.filter(ing => ing.ingredient_search === excludeIng);
                    
                    // ...verify it's either replaceable via an option group
                    return matchedIngs.every(ing => {
                        if (ing.option_type === 'none') {
                            // "none" means no alternative exists—cannot avoid
                            return false;
                        }
                        // If there's an option group, see if the group has at least one different ingredient
                        const group = optionGroups[ing.option_type] || [];
                        return group.some(optIng => optIng !== excludeIng);
                    });
                }
                
                // Incorporate the user's chosen exclusionType (AND / OR) with the new “can avoid” logic
                if (exclusionType === 'AND') {
                    // "AND" means:  
                    // *Previously:* Exclude the recipe only if it contains **all** excluded ingredients.  
                    // *Now with options:* Exclude the recipe only if it **cannot avoid** all those excludes.  
                    // So, the recipe passes if it can avoid each excluded ingredient.
                    excludeMatch = excludes.every(excludeIng => canAvoidExcludedIngredient(excludeIng));
                } else {
                    // "OR" means:  
                    // *Previously:* Exclude the recipe if it contains **any** excluded ingredient.  
                    // *Now with options:* Exclude if it absolutely cannot avoid at least one exclude.  
                    // So, the recipe fails if there's at least one exclude it can't avoid.
                    excludeMatch = !excludes.some(excludeIng => !canAvoidExcludedIngredient(excludeIng));
                }
            }
            
    
        // Serving size filter
        let servingMatch = servingSize === 'Any' || 
            (servingSize === 'Standard' && recipe.Serving === 'Standard') ||
            (servingSize === 'Serves multiple' && recipe.Serving !== 'Standard');
    
        // Glass type filter
        let glassMatch = effectiveGlassTypes.length === 0 || effectiveGlassTypes.some(glass => {
            return recipe['Glass type'] === glass || (!recipe['Glass type'] && glass === 'No glass specified');
        });
    
        // Only filter with correct replaceable options handling
        let onlyMatch;

        if (only.length === 0) {
            onlyMatch = true; // No 'only' restrictions
        } else if (recipe.has_option === 1) { // Recipes with options
            // Step 1: Group ingredients by option type
            const optionGroups = recipe.Ingredients.reduce((groups, ing) => {
                if (ing.option_type !== "none") {
                    if (!groups[ing.option_type]) {
                        groups[ing.option_type] = [];
                    }
                groups[ing.option_type].push(ing);
                }
                return groups;
            }, {});

            // Step 2: Check that each option group has at least one valid ingredient in 'only'
            const optionGroupMatch = Object.entries(optionGroups).every(([optionType, groupIngredients]) => {
                // Check if the group contains at least one ignorable ingredient
                const containsIgnorable = groupIngredients.some(ing => ing.ingredient_search_b === "Ignore");
                // If the group contains an ignorable ingredient, the group automatically matches
                if (containsIgnorable) {
                    return true;
                }
                // Otherwise, check if at least one valid ingredient is in the 'only' list
                const filteredGroupIngredients = groupIngredients.filter(ing => ing.ingredient_search_b !== "Ignore");
                return filteredGroupIngredients.some(ing => only.includes(ing.ingredient_search));
            });            

            // Step 3: Check non-option ingredients
            const nonOptionIngredients = recipe.Ingredients
                .filter(ing => ing.option_type === "none" && ing.ingredient_search_b !== "Ignore") // Exclude "Ignore"
                .map(ing => ing.ingredient_search);

            const nonOptionMatch = nonOptionIngredients.every(ingredient => only.includes(ingredient));

            // Combine option-based and non-option-based checks
            onlyMatch = optionGroupMatch && nonOptionMatch;

        } else { // Recipes without options
            // Filter out ingredients where `ingredient_search_b === "Ignore"`
            const validIngredients = recipe.Ingredients
                .filter(ing => ing.ingredient_search_b !== "Ignore")
                .map(ing => ing.ingredient_search);

            // Check if all remaining ingredients match the 'only' list
            onlyMatch = validIngredients.every(ingredient => only.includes(ingredient));
        }

    
        return includeMatch && excludeMatch && servingMatch && glassMatch && onlyMatch;
    });       

    displayRecipes(filteredRecipes);
}

function updateScrollFade() {
        const container = document.getElementById('recipes-container');
      
        // For the new recipe-card logic
        const containerRect = container.getBoundingClientRect();
        const TOP_THRESHOLD = 200;    // triggers fade near top
        const BOTTOM_THRESHOLD = 100; // triggers fade near bottom
      
        // For the original header logic
        const scrollTop = container.scrollTop;
        const containerHeight = container.offsetHeight;
      
        Array.from(container.children).forEach(element => {
          if (element.classList.contains('visible')) {
            //
            // --- NEW LOGIC: Simple "fade or not" for recipe cards ---
            //
            const elementRect = element.getBoundingClientRect();
      
            // Distance from the card's bottom to the container's top
            const distanceFromTop = elementRect.bottom - containerRect.top;
      
            // Distance from the card's top to the container's bottom
            const distanceFromBottom = containerRect.bottom - elementRect.top;
      
            // Fade out if the bottom is within TOP_THRESHOLD px of the top
            if (distanceFromTop < TOP_THRESHOLD) {
              element.style.opacity = 0.2;
      
            // Fade out if the top is within BOTTOM_THRESHOLD px of the bottom
            } else if (distanceFromBottom < BOTTOM_THRESHOLD) {
              element.style.opacity = 0.2;
      
            // Otherwise full opacity
            } else {
              element.style.opacity = 1;
            }
      
          } else if (element.classList.contains('recipe-alpha-header')) {
            //
            // --- ORIGINAL LOGIC: for alphabetical headers ---
            //
            const headerTop = element.offsetTop - scrollTop;
            const headerBottom = headerTop + element.offsetHeight;
      
            // Slower fade in if the header is near the top
            if (headerTop < 50) {
              element.style.opacity = Math.max(headerTop / 100, 0.2);
      
            // Slower fade out if the header is near the bottom
            } else if (headerTop > containerHeight - 50) {
              element.style.opacity = Math.max(
                (containerHeight - headerTop) / 50,
                0.2
              );
      
            // Otherwise fully visible
            } else {
              element.style.opacity = 1;
            }
          }
        });
      }
 
let lastSearchTerm = ''; // Variable to store the last searched term
  // search with return / enter
  document.getElementById('search-box').addEventListener('keypress', function(e) {

    // Check if the key pressed is the Enter key
    if (e.key === 'Enter' || e.keyCode === 13) {

        // Prevent the default action to avoid submitting the form if any
        e.preventDefault();
        const searchTerm = e.target.value.trim();

        if (searchTerm.length > 2) { // Check if the input length requirement is met
            lastSearchTerm = searchTerm; // Update the last searched term
            const searchResults = performSearch(searchTerm);
            displayRecipes(searchResults, true);
        } else {
            displayRecipes(window.recipes); // Display all recipes if search term is cleared or too short
        }
    }
});

function performSearch(query) {
    const results = window.fuse.search(query);
    return results.map(result => result.item); // Extract the original item from the search result
}

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Wrapped search event handler with the debounce function
  const debouncedSearch = debounce((e) => {
    const searchTerm = e.target.value.trim();

    if(searchTerm === lastSearchTerm) {

    }
    else {
        if (searchTerm.length > 2 && searchTerm !== lastSearchTerm) { // To prevent searching for too short strings
            lastSearchTerm = searchTerm; // Update the last searched term
            const searchResults = performSearch(searchTerm);
            displayRecipes(searchResults, true);
        } else {
            lastSearchTerm = '';
          displayRecipes(window.recipes); // Display all recipes if search term is cleared or too short
        }
    }
  }, 2000); // 2000 milliseconds delay 
  
  // Attach the debounced event handler to the search input
  document.getElementById('search-box').addEventListener('input', debouncedSearch); 

 

document.getElementById('filter-check').addEventListener('change', function() {
    document.getElementById('main-container').classList.toggle('filter-active');
});

document.addEventListener("DOMContentLoaded", function() {
    const filterCheckbox = document.getElementById('filter-check');
    const mainContainer = document.getElementById('main-container');

    filterCheckbox.addEventListener('change', function() {
        if (filterCheckbox.checked) {
            mainContainer.classList.add('filter-active');
        } else {
            mainContainer.classList.remove('filter-active');
        }
    });
});

document.addEventListener("DOMContentLoaded", function() {
    const filterCheckbox = document.getElementById('filter-check');
    const mainContainer = document.getElementById('main-container');
    const filterMenu = document.querySelector('.filter-menu'); // Select the filter menu
    const filterButton = document.querySelector('label #filter-btn'); // Select the filter button

    // Toggle filter menu when checkbox changes
    filterCheckbox.addEventListener('change', function() {
        if (filterCheckbox.checked) {
            mainContainer.classList.add('filter-active');

            // Add the event listener to close the menu when clicking outside
            document.addEventListener('click', handleOutsideClick);
        } else {
            mainContainer.classList.remove('filter-active');

            // Remove the event listener when the menu is closed
            document.removeEventListener('click', handleOutsideClick);
        }
    });

    function handleOutsideClick(event) {
        // Check if the click is outside the filter menu and not on the filter button
        if (!filterMenu.contains(event.target) && !filterButton.contains(event.target) && !event.target.closest('label')) {
            filterCheckbox.checked = false;
            mainContainer.classList.remove('filter-active');

            // Remove the event listener after closing the menu
            document.removeEventListener('click', handleOutsideClick);
        }
    }
});


// Select the menu checkbox (for opening/closing the menu)
const menuCheckbox = document.getElementById('menu-check');

// Select the menu element itself
const menuPopup = document.querySelector('.menu-popup');

// Listen for pointerdown (mouse clicks or touch) on the document
document.addEventListener('pointerdown', function(event) {
    // Check if the menu is open (checkbox is checked)
    if (menuCheckbox.checked) {
        // Check if the click happened outside the menu and outside the menu toggle button
        if (!menuPopup.contains(event.target) && !event.target.closest('label[for="menu-check"]')) {
            // Uncheck the checkbox to close the menu
            menuCheckbox.checked = false;
        }
    }
});

// Prevent closing the menu if the click is on the menu toggle button (label for menu-check)
const menuToggleLabel = document.querySelector('label[for="menu-check"]');
menuToggleLabel.addEventListener('pointerdown', function(event) {
    // Stop propagation so it doesn't trigger the document's pointerdown listener
    event.stopPropagation();
});