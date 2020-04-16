let name_heading = document.querySelector(".top > h2")
let score_heading = document.querySelector(".top > h3")
let delete_name = document.querySelector(".del > button")
let overlay = document.querySelector(".main-pane > .overlay")
let get_q = document.querySelector(".overlay > .overlay-display > .buttons > .start> button")
let question_answer = document.querySelector(".main-pane > .qna")
let count = 0
let cat_select = document.querySelector("#category")
let ques_diff = document.querySelector("#difficulty")
let ques_type = document.querySelector("#type")
let ques_amt = document.querySelector("#amount")
let game_customize = document.querySelector("#game_customizer")
let templ = getTemplate("connected-user")
let peer
let formt = document.querySelector(".bottom>.right>#new_conn")
let connected_peers_count = 0
let left = document.querySelector(".bottom >.left-overlay>.left")
let current_question_number = 0
let user_answers = []


function toggle(e) {
    if (document.documentElement.getAttribute('data-theme') == 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        e.target.setAttribute("title", "Dark Mode")
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        e.target.setAttribute("title", "Light Mode")
    }
}
question_answer.setAttribute("style", "display:none")
game_customize.setAttribute("style", "display:none")
game_customize.addEventListener("submit", () => {
    e.preventDefault()
})
// left.setAttribute('style', 'display:none')
document.querySelector(".next").setAttribute("style", "display:none")

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

// overlay.classList.add("inny")
// setTimeout(() => {
//     overlay.classList.remove("inny")
// }, 900)

if (localStorage.getItem('User Name') != null) {
    get_q.disabled = false
    name_heading.innerText = localStorage.getItem('User Name')
    score_heading.innerText = localStorage.getItem('User High Score')
    peering()
} else {
    name_heading.parentNode.prepend(getTemplate("formmer"))
}

get_q.addEventListener("click", e => {

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

    question_url = "https://opentdb.com/api.php?" + question_amount + question_category + question_type + question_difficulty + "&encode=base64"

    fetch(question_url).then(data => data.json()).then(json => {
        json.results
        localStorage.setItem("Questions", JSON.stringify(json.results))
        display_question();
    })

    localStorage.setItem("User Score", 0)
    score_heading.innerText = localStorage.getItem("User Score")

    question_answer.setAttribute("style", "display:block")
        // question_answer.classList.add("")
    overlay.classList.add("slideOutLeft")
    document.querySelector(".next").setAttribute("style", "display:block")
    setTimeout(() => {
        overlay.classList.remove("slideOutLeft")
        overlay.setAttribute("style", "display:none")
    }, 500)
})

function display_question() {

    let triviaclone = getTemplate("trivia")
    let question_set = JSON.parse(localStorage.getItem("Questions"))[current_question_number]


    let current_question = atob(question_set.question)

    console.log(current_question)

    triviaclone.querySelector(".question-no > h1").innerHTML = "Question " + (current_question_number + 1) + " : " + atob(question_set.category)

    triviaclone.querySelector(".question > h1").innerHTML = current_question

    let answers = question_set.incorrect_answers
    answers.push(question_set.correct_answer)

    answers = shuffle(answers)

    answers.forEach(answer => {
        let ans = getTemplate("single_answer")
        ans.querySelector(".answer").innerHTML = atob(answer)
        triviaclone.querySelector(".answers").appendChild(ans)
    })

    question_answer.classList.add("zoomOut")
    setTimeout(() => {
        question_answer.classList.remove("zoomOut")
        question_answer.innerText = ""
        question_answer.classList.add("zoomIn")
        question_answer.append(triviaclone)
    }, 500)


    current_question_number++
}

function shuffle(array) {
    let currentIndex = array.length,
        temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}


document.querySelector("#qnext").addEventListener("click", e => {
    console.log(current_question_number + "    " + (JSON.parse(localStorage.getItem("Questions")).length - 1))

    if (document.querySelector(".set") !== null) {
        if ((current_question_number) <= (JSON.parse(localStorage.getItem("Questions")).length - 1)) {

            user_answers.push(document.querySelector(".set").innerText)
            console.log(user_answers)
            let question_set = JSON.parse(localStorage.getItem("Questions"))[current_question_number - 1]
            if (atob(question_set.correct_answer) == user_answers[current_question_number - 1]) {
                let sco = parseInt(localStorage.getItem('User Score'))
                sco = sco + 10
                localStorage.setItem("User Score", sco)
                score_heading.innerText = localStorage.getItem("User Score")
                if (sco > parseInt(localStorage.getItem('User High Score'))) {
                    localStorage.setItem('User High Score', sco)
                    snack("New High Score " + sco)
                }
            }
            display_question()

        } else {
            let question_set = JSON.parse(localStorage.getItem("Questions"))

            user_answers.push(document.querySelector(".set").innerText)
            if (atob(question_set[current_question_number - 1].correct_answer) == user_answers[current_question_number - 1]) {
                let sco = parseInt(localStorage.getItem('User Score'))
                sco = sco + 10
                localStorage.setItem("User Score", sco)
                score_heading.innerText = localStorage.getItem("User Score")
                if (sco > parseInt(localStorage.getItem('User High Score'))) {
                    localStorage.setItem('User High Score', sco)
                    snack("New High Score " + sco)
                }
            }

            // console.log(user_answers)
            document.querySelector(".summary-overlay").setAttribute("style", "display:block")
            document.querySelector(".summary-overlay").classList.add('slideInLeft')
            let msg = getTemplate("end-msg")
            let sco = parseInt(localStorage.getItem("User Score"))
            msg.querySelector(".greet").innerText = sco > 60 ? "Amazing!! your final Score is" : "Your final Score is"
            msg.querySelector(".final-score").innerText = sco
            document.querySelector(".summary-display>.congrats").append(msg)

            question_set.forEach((q, i) => {
                let summary_temp = getTemplate("sum-tem")
                let qstn = atob(q.question)
                let u_ans = user_answers[i]
                // console.log(u_ans)
                summary_temp.querySelector(".summary-q > .sum-q > p").innerHTML = qstn
                summary_temp.querySelector(".summary-q > .sum-ans > .correct").innerHTML = atob(q.correct_answer)
                summary_temp.querySelector(".summary-q > .sum-ans > .user").innerHTML = u_ans
                if (u_ans == atob(q.correct_answer)) {
                    summary_temp.querySelector(".summary-q > .sum-ans > .user").classList.add("correct")
                } else {
                    summary_temp.querySelector(".summary-q > .sum-ans > .user").classList.add("incorrect")
                }
                document.querySelector(".sum-wrapper > .summary").append(summary_temp)
            })

            setTimeout(() => {
                question_answer.setAttribute("style", "display:none")
                overlay.setAttribute("style", "display:block")
            }, 500)

        }
    } else {
        e.target.classList.add('shake')
        e.target.classList.add('shake')
        setTimeout(() => {
            e.target.classList.remove('shake')
        }, 500)
    }

})


function getTemplate(TId) {
    if (!window.templates) {
        window.templates = {}
    }

    if (!window.templates[TId]) {
        window.templates[TId] = document.querySelector(`template#${TId}`).content
    }
    // return window.templates[TId].content.cloneNode(true)
    return document.importNode(window.templates[TId], true)
}

delete_name.addEventListener("click", e => {
    if (localStorage.getItem("User Name") != null) {
        peer.destroy(() => {
            console.log("destroyed")
        })
        name_heading.parentNode.prepend(getTemplate("formmer"))
        localStorage.removeItem("User Name")
        name_heading.innerText = "Enter User Name"
        score_heading.innerText = "0"
        if (overlay.style.display == "none") {
            overlay.classList.add("slideInLeft")
            overlay.setAttribute("style", "display:block")
        }
        get_q.disabled = true
        formt.querySelector("input[type='submit']").disabled = true
        connected_peers_count = 0
        left.setAttribute("style", "display:none")
        left.innerHTML = ""
        setTimeout(() => {
            overlay.classList.remove("slideInLeft")
            question_answer.innerHTML = ""
            snack("Disconnected")
        }, 500)
    }
})

function api_config(e) {
    if (game_customize.getAttribute("style") == "display:none") {

        game_customize.setAttribute("style", "display:flex")
        game_customize.classList.add("slideInLeft")

        document.querySelectorAll(".remove_on_setting").forEach(el => {
            el.classList.add("zoomOut")
            setTimeout(() => {
                game_customize.classList.remove("slideInLeft")
                document.querySelectorAll(".remove_on_setting").forEach(el => {
                    el.classList.remove("zoomOut")
                    el.setAttribute("style", "display:none")
                })
            }, 500)
        })
    } else {
        game_customize.classList.add("slideOutLeft")

        document.querySelectorAll(".remove_on_setting").forEach(el => {
            el.classList.add("zoomIn")
            el.setAttribute("style", "display:flex")
            setTimeout(() => {
                game_customize.setAttribute("style", "display:none")
                game_customize.classList.remove("slideOutLeft")
                document.querySelectorAll(".remove_on_setting").forEach(el => {
                    el.classList.remove("zoomIn")
                })
            }, 500)
        })
    }
}

function finn(e) {

    overlay.setAttribute("style", "display:block")
    localStorage.setItem("Questions", "")
    localStorage.setItem("User Score", 0)
    current_question_number = 0
    user_answers = []
    setTimeout(() => {
        question_answer.innerHTML = ""
        score_heading.innerText = localStorage.getItem("User High Score")
        document.querySelector(".next").setAttribute("style", "display:none")
    }, 500)
}

document.querySelector(".finish > button").addEventListener("click", e => {
    localStorage.setItem("Questions", "")
    localStorage.setItem("User Score", 0)
    current_question_number = 0
    user_answers = []
    document.querySelector(".summary-overlay").classList.remove('slideInLeft')
    document.querySelector(".summary-overlay").classList.add("slideOutLeft")
    setTimeout(() => {
        score_heading.innerText = localStorage.getItem("User High Score")
        document.querySelector(".summary-overlay").classList.remove("slideOutLeft")
        document.querySelector(".summary-overlay").setAttribute("style", "display:none")
        document.querySelector(".sum-wrapper > .summary").innerText = ""
        document.querySelector(".summary-display>.congrats").innerText = ""
    }, 500)
})


function peering() {
    peer = new Peer(localStorage.getItem("User Name"));
    peer.on('open', function(id) {
        console.log("connected")
        formt.querySelector("input[type='submit']").disabled = false
        snack("Connected")
    });

    peer.on('connection', function(conn) {
        conn.on('open', () => {
            connection_basic(conn)
        });
    });

    peer.on("close", () => {
        console.log("Closed")
        snack("closed")
    })

    peer.on('disconnected', () => {
        console.log("disconnected")
        snack("Disconnected")
    });

    peer.on('error', (err) => {
        console.log(err.type)
        snack("Error " + err.type)
    });
}

function connection_basic(conn) {
    conn.send({
        name: localStorage.getItem("User Name"),
        score: localStorage.getItem("User High Score")
    });
    conn.on('data', function(data) {
        let temp2 = getTemplate("connected-user")
        temp2.querySelector(".participant-info > .info >.participant-name").innerText = data.name
        temp2.querySelector(".participant-info > .info >.participant-score").innerText = data.score
        left.insertBefore(temp2, left.childNodes[0])
        if (connected_peers_count == 0) {
            left.setAttribute('style', 'display:flex')
            connected_peers_count++
        }
    });
}

formt.addEventListener("submit", e => {
    // debugger
    let name = e.target.querySelector("#new_conn_name")
    e.preventDefault()

    let conn = peer.connect(name.value);
    // on open will be launch when you successfully connect to PeerServer
    conn.on('open', () => {
        connection_basic(conn)
    });
})

function snack(message) {
    var x = document.querySelector("#snackbar");
    x.className = "show";
    x.querySelector("#message").innerText = message
    setTimeout(function() { x.className = x.className.replace("show", ""); }, 3000);
}

function answer(e) {
    if (question_answer.querySelector(".answers > .set") != null) {
        question_answer.querySelector(".answers > .set").classList.remove("set")
        if (question_answer.querySelector(".answers > .set") != e.target) {
            e.target.classList.add("set")
        }
    } else {
        e.target.classList.add("set")
    }
}