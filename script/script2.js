let name_heading = document.querySelector(".top > h2")
let delete_name = document.querySelector(".del > button")
let overlay = document.querySelector(".main-pane > .overlay")
let get_q = document.querySelector(".overlay > .overlay-display > button")
let question_answer = document.querySelector(".main-pane > .qna")
let count = 0
let warner = document.querySelector(".overlay-display > .warner")

overlay.classList.add("inny")
setTimeout(() => {
    overlay.classList.remove("inny")
}, 900)

if (localStorage.getItem('User Name') != null) {
    get_q.disabled = false
    warner.setAttribute("style","display:none")
    name_heading.innerText = localStorage.getItem('User Name')
} else {
    name_heading.parentNode.prepend(getTemplate("formmer"))
}

get_q.addEventListener("click", e => {

    question_answer.appendChild(getTemplate("trivia"))

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
        } else{
            warner.classList.add("inny3")
            warner.setAttribute("style","display:block")
        }
        get_q.disabled = true
        setTimeout(() => {
            warner.classList.remove("inny3")
            overlay.classList.remove("inny")
            question_answer.innerHTML = ""
        }, 900)
    }
})