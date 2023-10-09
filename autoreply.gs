/**
 * Initializes the email response system.
 * @returns {Promise<void>}
 */
async function init() {
  // Whether to actually send emails, or just log.
  const LIVE_MODE = false; // TODO change this to true when ready to go live.

  const myEmail = "josephedwardwork@gmail.com";
  // Gmail.Users.getProfile('me').emailAddress;
  if (!myEmail || myEmail.indexOf("@") === -1) {
    throw new Error("Error fetching my email.");
  }
  log("My email: " + myEmail);

  // Fetch threads.
  const start = 0;
  const max = 10;

  var threads = GmailApp.search("label:gpt after:2021/05/01", start, max);
  log("Fetched " + threads.length + " threads");

  threads.forEach(async function (thread) {
    const messages = thread.getMessages();
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    log("=================== New thread");
    log("First message:");
    log("from: " + firstMessage.getFrom());
    log("Last message:");
    log("subject: " + lastMessage.getSubject());
    log("from: " + lastMessage.getFrom());
    log("body: " + lastMessage.getPlainBody());
    log(
      "sent: " +
        lastMessage.getDate() +
        " (" +
        daysSince(lastMessage.getDate(), Date.now()) +
        " days ago)"
    );

    // Skip threads where I've already replied to any message.
    const hasReplied = messages.some(function (message) {
      return message.getFrom().indexOf(myEmail) !== -1;
    });

    const hasUnread = messages.some(function (message) {
      return message.isUnread();
    });

    // if (hasReplied && hasUnread) {
    //   log("Already replied once, skipping...");
    //   return;
    // }

    if (!LIVE_MODE) {
      log("--- Would have replied to email here ---");
    }

    let name = lastMessage.getFrom().split(" ")[0];

    const replyBody = await generateEmailResponse(
      lastMessage.getBody().trim(),
      lastMessage.getSubject().trim(),
      lastMessage.getFrom().trim(),
      name
    );
    log("reply : ", replyBody);

    lastMessage.reply(replyBody);

    log("Reply sent!");
  });
}

init();

/**
 * Logs a message to both Logger and console.
 * @param {string} msg - The message to log.
 * @returns {void}
 */
function log(msg) {
  // Log to both Logger and console. Logger for development, console for
  // Stackdriver logging.
  Logger.log(msg);
  // console.log(msg);
}

/**
 * Calculates the number of days between two dates.
 * @param {number} dateA - The first date in Unix timestamp format.
 * @param {number} dateB - The second date in Unix timestamp format.
 * @returns {number} - The number of days between the two dates.
 */
function daysSince(dateA, dateB) {
  return Math.round(Math.abs((dateA - dateB) / (24 * 60 * 60 * 1000)));
}

/**
 * Generates an email response using OpenAI's GPT-3 API.
 * @param {string} emailSubject - The subject of the email.
 * @param {string} emailBody - The body of the email.
 * @param {string} _emailSender - The email address of the sender.
 * @param {string} name - The first name of the sender.
 * @returns {Promise<string>} - The generated email response.
 */
async function generateEmailResponse(
  emailSubject,
  emailBody,
  emailSender,
  name
) {
//  const apiKey = "sk-YOUR_API_KEY";

  const prompt = `Compose a reply to "${name}" who has an email address at ${emailSender} with the subject: "${emailBody}"`;

  const data = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant responding to ${name} who has an email address at ${emailSender} with an email on behalf of Joseph Edward about ${emailBody} with the subject of ${emailSubject}. Here is my contact information to include: 
        - josephedwardwork@gmail.com
        - calendly.com/josephedwardwork
        - 804-803-3517
        `,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  };

  log("data for OpenAI : ", data.messages);
  const apiUrl = "https://api.openai.com/v1/chat/completions";

  let res = await HttpRequestApp.newRequest(apiUrl)
    .setMethod("POST")
    .setHeader("Authorization", `Bearer ${apiKey}`)
    .setContentType("application/json")
    .setPayload(JSON.stringify(data))
    .fetch();

  log("API response: ", res);

  res = JSON.parse(res.getContentText());

  return res.choices[0].message.content;
}
