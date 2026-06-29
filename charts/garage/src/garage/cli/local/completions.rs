use structopt::{clap::Shell, StructOpt};

use crate::Opt;

pub(crate) fn generate_completions(shell: Shell) {
	let mut command = Opt::clap();

	let command_name = command.get_name().to_string();
	command.gen_completions_to(command_name, shell, &mut std::io::stdout());
}
