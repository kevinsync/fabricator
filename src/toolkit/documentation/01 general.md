# Redesign - FAQ #

![HR](toolkit/images/documentation/001.png)

## How do I get started? ##

1. `git clone https://github.com/kevinsync/fabricator.git`
2. `cd redesign`
3. `git checkout development`
3. `npm install`
4. `gulp dev`

If `gulp` doesn't exist, try `sudo npm install -g gulp` and `gulp dev` again after it's done.

If `gulp dev` *does* run but gives you errors about specific node packages (ex. `Error: Cannot find module 'run-sequence'`) then try installing each of those referenced packages manually (ex. `npm install run-sequence`)

This can be a pain, but once your environment is set up, you should be good to go for the rest of the project.

All work is done on the `development` branch; the project lead will worry about merges to `master`.

![HR](toolkit/images/documentation/001.png)

## Where do I add third-party JavaScript libraries? ##

1. Put your files in **src/toolkit/scripts** 
2. Update **gulpfile.js** to reference the added **.js**; these files are prepended (in order of declaration) to the top of **toolkit.js**

![000](toolkit/images/documentation/000.png)

## Where do I add third-party CSS stylesheets? ##

1. Put your files in **src/toolkit/styles** 
2. Update **gulpfile.js** to reference the added **.css** similar to the JavaScript instructions above; these files are concatenated (in order of declaration) to **vendor.css**

![HR](toolkit/images/documentation/001.png)

## Where is the toolkit HTML for header, footer, etc? ##

This is for locating the HTML wrapping each template's body content (`<head>`, etc).

- **[src/toolkit/views/partials/intro.html](../src/toolkit/views/partials/intro.html)**
- **[src/toolkit/views/partials/outro.html](../src/toolkit/views/partials/outro.html)**

![HR](toolkit/images/documentation/001.png)

## Where do I update toolkit landing page content? ##

This would be where you add color swatches, basic typography examples, etc.

- **[src/toolkit/views/index.html](../src/toolkit/views/index.html)**

![HR](toolkit/images/documentation/001.png)

## How do I create a new component? ##

Assume we're making **button.html**.
  
1. Your HTML goes here: **src/toolkit/components/button.html**
  
2. You can create a companion SCSS file here: **src/toolkit/styles/components/_button.scss**
	- prefix the filename with an underscore
	- add this to **src/toolkit/styles/toolkit.scss**:
	- `@import "components/button";`
  
This component can now be referenced in structures and templates as `{{button}}`

![HR](toolkit/images/documentation/001.png)

## How do I make my components build and display in a certain order in the left-hand menu? ##

Prefix all of your **.html** and **.md** files using numbers and periods.

**Example:**

	01.01.button.html
	01.02.button-primary.html
	01.03.button-secondary.html

	02.01.component.html
	02.02.component-primary.html
	02.03.component-secondary.html

	03.intro.md
	04.body.md
	05.outro.md

This forces files to be ordered on the filesystem how you wish, and Fabricator will strip out the leading numbers and periods when displaying the item names.

You can use an unlimited level of "nesting" in your prefix (ex. `01.` or `01.01.` or `01.01.01.` etc)

![HR](toolkit/images/documentation/001.png)

## How do I exclude components from the left-hand menu? ##

You can add **.__** to the final part of the filename prefix as described above to ensure that the given file doesn't build into the menus that Fabricator generates. 

Because of the sequential nature by which Fabricator builds components, parent files need to load before any child files that extend them. This creates a scenario where it's best to lay out all of your components in sequential order, hide them, then create a single "combination view" that builds last that shows example usage of all the component variations.  

**Example:**

	01.01.__ button.html
	01.02.__ button-primary.html
	01.03.__ button-secondary.html
	01.99 button-examples.html

	02.01.__ component.html
	02.02.__ component-primary.html
	02.03.__ component-secondary.html
	02.99 component-examples.html

	03.intro.md
	04.body.md
	05.outro.md

![HR](toolkit/images/documentation/001.png)

## How do I pass custom parameters to a component? ##

This project uses a custom version of `collate.js` that allows you to pass in arbitrary data with which you can use to populate component attributes.

**How Fabricator used to work:**

Assuming you had a component `{{button}}`, the only option was to pass in class names.

If you wrote `{{button 'my-custom-class'}}`, the output would be:

	<input type="button" value="Go" class="my-custom-class" />

**How this version of Fabricator works:**

The optional string argument that used to be just a class name can now be a JSON string that gets parsed accordingly.

If you wrote `{{button '{"classname" : "my-custom-class", "value" : "Click Me", "data-validate-me" : "true"}'}}`, the output would be:

	<input type="button" value="Click Me" class="my-custom-class" data-validate-me="true" />

You can define any attributes that you like, as long as the string passed in is escaped, correctly-formed JSON.

In the rare event that you use this feature and the first time you load a page after `gulp dev` comes up as the word **null**, just open that component, structure or template, make a change and save it. It should regenerate correctly from that point on.

**NOTE:** these attributes are applied to the container element in the template that is being referenced. 

For instance, look at this component `{{button-container}}`:

	<div class="container">
		Click me: {{button}}
	</div>

If you use `{{button-container '{"classname" : "my-button-container", "style" : "display: none;"}'}}`, this is the output you get:

	<div class="my-button-container" style="display: none;">
		Click me: <input type="button" value="Go" />
	</div>

The parent `<div>` is the only node that's being extended.   

**What if I need to modify child elements inside of a component?**

You can create a **.json** file that accompanies your component **.html** that is an associative array of key-value pairs that allow you to populate arbitrary child elements inside of a component with custom data.

This is valuable when you need to show a client a page full of contextually-relevant data instead of just templates.

Each root-level key is the name of a **data template**, with its accompanying value a secondary associative array whose key-value pairs are **CSS selector -> attribute(s)**.

Take a look at this example:

**COMPONENT HTML:**

	<div>
		<h1>Default Headline</h1>
		<img src="path" />
	</div>

**COMPONENT JSON:**

	{"key"  : {"h1"  : "My New Headline",
			   "img" : {"src" : "test"}               
			  },
	 "key2" : {"h1"  : "My Other New Headline",
			   "img" : {"src" : "test 2"}               
			  }
	}

**USAGE IN A STRUCTURE:**

	{{component '{"data" : "key"}'}}
	{{component '{"data" : "key2"}'}}

**STRUCTURE HTML OUTPUT:**

	<div>
		<h1>My New Headline</h1>
		<img src="test" />
	</div>

	<div>
		<h1>My Other New Headline</h1>
		<img src="test 2" />
	</div>

![HR](toolkit/images/documentation/001.png)

## Why would I pass custom parameters to a component? ##

Oftentimes when Fabricator is used, especially before any integration is completed, clients want to see our templates populated with "correct" data (images, button text, etc). 

That more-or-less runs counter to the original purpose of the tool, but this extension allows us to meet them in the middle without disrupting development too much.

![HR](toolkit/images/documentation/001.png)
 