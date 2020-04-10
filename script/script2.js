let name_heading = document.querySelector(".top > h2")
let delete_name = document.querySelector(".del > button")
let overlay = document.querySelector(".main-pane > .overlay")
let get_q = document.querySelector(".overlay > .overlay-display > .buttons > .start> button")
let question_answer = document.querySelector(".main-pane > .qna")
let count = 0
let warner = document.querySelector(".overlay-display > .warner")
let cat_select = document.querySelector("#category")
let ques_diff = document.querySelector("#difficulty")
let ques_type = document.querySelector("#type")
let ques_amt = document.querySelector("#amount")
let game_customize = document.querySelector("#game_customizer")

game_customize.classList.add("hider")
fetch("https://opentdb.com/api_category.php").then(data => data.json()).then(json => json.trivia_categories).then(categories => {
    categories.forEach(category => {
        var opt = document.createElement('option');
        name = category.name.replace("Entertainment: ", "")
        name = name.replace("Japanese ", "")
        name = name.replace("Science: ", "")
        opt.appendChild(document.createTextNode(name));
        opt.value = category.id;
        cat_select.appendChild(opt)
    });
})

console.log(cat_select.value)

overlay.classList.add("inny")
setTimeout(() => {
    overlay.classList.remove("inny")
}, 900)

if (localStorage.getItem('User Name') != null) {
    get_q.disabled = false
    warner.setAttribute("style", "display:none")
    name_heading.innerText = localStorage.getItem('User Name')
} else {
    name_heading.parentNode.prepend(getTemplate("formmer"))
}

get_q.addEventListener("click", e => {

    let triviaclone = getTemplate("trivia")
    let question_category
    let question_difficulty
    let question_amount
    let question_type
    let question_url

    if (cat_select.value != null && cat_select.value != "") {
        question_category = "&category=" + cat_select.value
    } else {
        question_category = ""
    }

    if (ques_diff.value != null && ques_diff.value != "") {
        question_difficulty = "&difficulty=" + ques_diff.value
    } else {
        question_difficulty = ""
    }

    if (ques_type.value != null && ques_type.value != "") {
        question_type = "&type=" + ques_type.value
    } else {
        question_type = ""
    }

    if (ques_amt.value != null && ques_amt.value != "") {
        question_amount = "amount=" + ques_amt.value
    } else {
        question_amount = "amount=10"
    }

    question_url = "https://opentdb.com/api.php?" + question_amount + question_category + question_type + question_difficulty

    question_answer.appendChild(triviaclone)

    overlay.classList.add("outy")
    setTimeout(() => {
        overlay.classList.remove("outy")
        overlay.setAttribute("style", "display:none")
    }, 900)
})

function getTemplate(TId) {
    if (!window.templates) {
        window.templates = {}
    }

    if (!window.templates[TId]) {
        window.templates[TId] = document.querySelector(`template#${TId}`).content
    }
    return document.importNode(window.templates[TId], true)
}

delete_name.addEventListener("click", e => {
    if (localStorage.getItem("User Name") != null) {

        name_heading.parentNode.prepend(getTemplate("formmer"))
        localStorage.removeItem("User Name")
        name_heading.innerText = "Enter User Name"
        if (overlay.style.display == "none") {
            overlay.classList.add("inny")
            overlay.setAttribute("style", "display:block")
        } else {
            warner.classList.add("inny3")
            warner.setAttribute("style", "display:block")
        }
        get_q.disabled = true
        setTimeout(() => {
            warner.classList.remove("inny3")
            overlay.classList.remove("inny")
            question_answer.innerHTML = ""
        }, 900)
    }
})

function api_config(e) {
    if (e.target.classList.contains("rotater")) {
        e.target.classList.remove("rotater")
        e.target.classList.add("rotater1")
    } else {
        e.target.classList.remove("rotater1")
        e.target.classList.add("rotater")
    }
    setTimeout(()=>{
        game_customize.classList.toggle("hider")
        game_customize.classList.add("inny")
        document.querySelectorAll(".remove_on_setting").forEach(el => {
            el.classList.toggle("hider")
            el.classList.add("inny")
        })
    },300)

}

function finn(e){

    overlay.classList.add("inny")
    overlay.setAttribute("style", "display:block")
    setTimeout(() => {
        overlay.classList.remove("inny")
        question_answer.innerHTML = ""
    }, 900)
}