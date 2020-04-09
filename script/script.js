
window.onload = function(){
    var mid = document.querySelector(".mid")
    var nam = document.querySelector(".top > h2")

    var form = document.querySelector("#formmer")
    var fclone = document.importNode(form.content, true)

    var trivia = document.querySelector('#trivia');
    var clone = document.importNode(trivia.content, true)

    mid.appendChild(clone)

    var next = document.querySelector("#qnext")

    // temporary next question and answer, animation logic
    next.addEventListener('click', () => {
        // alert("adjis")
        document.querySelector(".question").classList.toggle("outy")
        document.querySelector(".answers").classList.toggle("flippy")
        if(document.querySelector(".answers > .set") != null){
            document.querySelector(".answers > .set").classList.remove("set")
        }
        setTimeout(()=> {
            document.querySelector(".question").classList.remove("outy")
            document.querySelector(".question").classList.toggle("inny")
            setTimeout(()=> {
                document.querySelector(".question").classList.remove("inny")
                document.querySelector(".answers").classList.remove("flippy")
            }, 850)
        }, 600)
    })

    // display username if exist else fill the form that will be removed after the username is entered
    if(localStorage.getItem('User Name') != null){
        document.querySelector(".top > h2").innerText = localStorage.getItem('User Name')
    } else{
        nam.parentNode.prepend(fclone)
        form_submit()
    }

    // delete the username
    document.querySelector(".bot > button").addEventListener("click", e => {
        if(localStorage.getItem('User Name') != null){
            var formt = document.querySelector("#formmer")
            var fclonet = document.importNode(formt.content, true)
            fclonet.querySelector("#name_form").classList.add("inny2")
            nam.parentNode.prepend(fclonet)
            localStorage.removeItem("User Name")
            nam.innerText = "Enter User Name"
            form_submit()
        }
    })
}

function answer(e){
    // debugger
    if(document.querySelector(".answers > .set") != null){
        document.querySelector(".answers > .set").classList.remove("set")
        if(document.querySelector(".answers > .set") != e.target){
            e.target.classList.add("set")
        }
    } else{
        e.target.classList.add("set")
    }
    
}

// function to help with repetitive code
function form_submit(){
    var dom_from = document.querySelector(".top > form")
    
    dom_from.addEventListener("submit", e => {
        dom_from.classList.remove("inny2")
        e.preventDefault();
        dom_from.classList.add("outy")
        var name = dom_from.querySelector("#name").value
        localStorage.setItem("User Name",name)
        document.querySelector(".top > h2").innerText = localStorage.getItem('User Name')
        setTimeout(() => {
            dom_from.classList.remove("outy")
            dom_from.remove()
        }, 400)
    })
}
