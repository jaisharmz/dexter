# proof-project

Finds the project that turns *"wants to move into this field"* into *"has already done some
of it"*. One field per run, two to four projects out, each specified tightly enough to start
on a Saturday.

Third in a set with `role-sourcing` (which companies) and `role-outreach` (how to reach
them). This one answers what to build so the reaching-out has something behind it.

## The idea

A good research idea and a good proof project are different objects. Research is judged by
whether the result matters; a proof project is judged by whether finishing it changes how a
stranger reads your application. Optimising for the first produces projects that take a year
and end in "it's complicated".

So every project here must end in **a sentence with a number in it that did not exist
before**, be finishable in a weekend or a fortnight, run on at most one GPU, and be able to
fail in a way that is still worth publishing.

## Where the gaps are

The heuristic, taken from six independent field surveys that all landed on the same shape:
**ask what the control experiment would be, and whether anyone has run it.** Usually nobody
has, because publishing the denominator caps your own numerator — so the people best
positioned to measure a benchmark's noise floor are the ones whose scores it would cap.
That is a structural gap, and it is why one person with a laptop can produce something a
lab with a cluster has not. A landscape survey of the field, such as one made with
`/industry-research`, is the place to start looking.

## Layout

    SKILL.md                    the operating document
    references/finding.md       how to find the gap -- six places, in hit-rate order
    references/form-factor.md   the seven-field spec every project must satisfy
    references/schema.md        the record to write
    config/assets.md            what the operator uniquely has, and the crossings

`config/assets.md` is the file to keep current. The crossings table at the bottom — where two
ordinary capabilities meet and almost nobody stands in both — is what separates a project
only this person could have done from a good project anyone could have done.

## Running it

    /proof-project "world models for biology"
    /proof-project inference --timebox weekend --n 3

One field per run. Re-run a field in a few months; gaps close, and the dated files show how
fast the field moves.
