// Conversation prompts grounded in the companion's existing unit guides.
// These are study suggestions, not claims about Woods' planned lecture sections.
export const lectureGuides = {
  digestion: {
    before: ['Trace one bite of food through the organs without looking at your notes.', 'Separate what you know about breaking food down from how nutrients enter circulation.'],
    sections: [
      {title:'Mechanical digestion, enzymes and absorption', listen:'Notice exactly which step changes particle size, which changes molecules, and which crosses a barrier.', ask:'Could we trace a bite of food together, with me naming what changes at each step? Please stop me when I confuse digestion with absorption.', followup:'Could you use a model or gesture for each step, then let me explain what each movement represents?'},
      {title:'Different routes for different nutrients', listen:'Watch where the paths for sugars, amino acids and dietary fats separate.', ask:'Could you pause just before each absorbed nutrient leaves an intestinal villus and let us predict its next destination?', followup:'If I choose the wrong route, what clue should I have noticed rather than memorized?'},
      {title:'Changing conditions or anatomy', listen:'Listen for the link between a changed condition and the specific function it affects.', ask:'Could we change one feature in a digestion or surgery example, let me predict the effect, and check each link in my reasoning?', followup:'What observation would make you reject my explanation?'}
    ]
  },
  urinary: {
    before: ['Sketch separate paths for blood and filtrate through the kidney.', 'Explain filtration, reabsorption, secretion and excretion aloud; flag where the direction is unclear.'],
    sections: [
      {title:'Blood versus filtrate', listen:'Follow the starting and ending compartment whenever a substance moves.', ask:'Could I trace a substance on the kidney model while you stop me at the first point where I switch blood and filtrate?', followup:'Could we mark the two routes with our hands and have me repeat the route without looking?'},
      {title:'Filtration and its regulation', listen:'Notice which pressure or barrier changes before the filtration outcome changes.', ask:'Could you think aloud through one filtration example, then change one variable and let me predict what happens?', followup:'Which part of my reasoning fails if the barrier changes rather than the pressure?'},
      {title:'Interpreting urine findings', listen:'Distinguish what a sample supports from what it cannot tell you by itself.', ask:'Could we work through a urine finding together, with me offering a mechanism and you asking for the evidence that supports it?', followup:'What extra finding would help us distinguish my explanation from a plausible alternative?'}
    ]
  },
  balance: {
    before: ['Draw a cell, interstitial fluid and a blood vessel as separate compartments.', 'Make one prediction about cell size in a changed solution, and write down your reason.'],
    sections: [
      {title:'Compartments and tonicity', listen:'Identify the membrane, the solute and whether that solute can cross it.', ask:'Could we use a model or hand gesture to show the compartments, then let me predict water movement before you reveal the result?', followup:'Which assumption about the solute would change my prediction?'},
      {title:'Buffers, lungs and kidneys', listen:'Listen for what each response changes and how quickly it can contribute.', ask:'Could you talk through a pH disturbance in time order and pause so I can explain what each system is responding to?', followup:'Can you point to the first link I have reversed, rather than giving me the whole answer again?'},
      {title:'Explaining the lab result', listen:'Keep the observation, the mechanism and the prediction separate.', ask:'Could I explain an egg-osmosis or exhaled-CO₂ result in my own words, then predict one changed condition for you to check?', followup:'What result would show that my explanation is incomplete?'}
    ]
  },
  endocrine: {
    before: ['Trace one signal from its source to a target and back through feedback.', 'Name a place where you confuse a hormone with the gland that releases it.'],
    sections: [
      {title:'Signals and receptors', listen:'Ask which cells can respond directly, rather than only where a hormone circulates.', ask:'Could you give me two target-cell examples and let me explain which responds and why, then challenge my explanation?', followup:'What is the smallest change that would make the other cell respond?'},
      {title:'Feedback loops', listen:'Track the direction of each change through the whole axis.', ask:'Could we act out or trace a feedback loop, with me predicting the next change each time you change one signal?', followup:'Please stop me at the first arrow I get backward and help me reconstruct just that step.'},
      {title:'Mystery-hormone experiments', listen:'Notice what the control lets you conclude and which findings rule out alternatives.', ask:'Could you think aloud as you compare a mystery-hormone treatment with its control, then let me reason through a second case?', followup:'Which observation separates my guess from the closest competing explanation?'}
    ]
  },
  immune: {
    before: ['Explain the difference between moving lymph and responding to a threat.', 'Try explaining innate versus adaptive defense to a classmate without listing vocabulary.'],
    sections: [
      {title:'Lymphatic routes and organs', listen:'Keep track of what fluid each organ or vessel handles.', ask:'Could I trace a fluid path on the model and explain the role of each stop while you check my reasoning?', followup:'Could we compare a lymph-node example with a spleen example and identify the clue I keep missing?'},
      {title:'Coordinating defenses', listen:'Follow the sequence of recognition, communication and response rather than treating cells as isolated definitions.', ask:'Could we walk through one encounter as a sequence, with me choosing who acts next and explaining why?', followup:'Where would my sequence break if one of those steps could not happen?'},
      {title:'Specificity and memory', listen:'Distinguish what changes on a later encounter from what stays specific to the antigen.', ask:'Could I explain a first and later encounter side by side, then have you test my explanation with a slightly different example?', followup:'Which part of my explanation confuses faster response with recognizing everything?'}
    ]
  },
  reproduction: {
    before: ['Sketch the relationship between the ovarian cycle and its hormone signals.', 'Identify one point where timing or feedback makes the process hard to explain.'],
    sections: [
      {title:'Gamete production and transport', listen:'Separate where a cell is produced, where it changes, and where it travels.', ask:'Could I trace the route on a model and explain what happens at each location, with you correcting the first mistaken step?', followup:'Could you have me repeat it from memory and ask why each location matters?'},
      {title:'Cycles and feedback', listen:'Notice the timing and conditions around a change in feedback.', ask:'Could you pause a cycle example at several points and let me predict the next hormone change before we check it?', followup:'What timing clue distinguishes this example from one where my prediction would be correct?'},
      {title:'Fertilization, development and birth', listen:'Connect each observed result or contraction to a mechanism and a stopping condition.', ask:'Could we use one lab or childbirth example for me to explain the cause-and-effect chain, then change one condition together?', followup:'Can you show the process with a model or gesture and ask me to translate it back into a mechanism?'}
    ]
  }
};
